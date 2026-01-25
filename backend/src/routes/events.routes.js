/**
 * Events & Ticketing Routes
 * API endpoints for events, tickets, guest lists, and check-ins
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const GuestList = require('../models/GuestList');

// ===== VALIDATION MIDDLEWARE =====
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ===== EVENTS =====

// Get all events with filters
router.get(
  '/events',
  [
    query('venueId').optional().notEmpty(),
    query('performerId').optional().notEmpty(),
    query('status').optional().isIn(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, performerId, status, startDate, endDate, limit = 50 } = req.query;

      const query = {};

      if (venueId) query.venueId = venueId;
      if (performerId) query.performerIds = performerId;
      if (status) query.status = status;

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const events = await Event.find(query)
        .sort({ date: 1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get upcoming events
router.get('/events/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await Event.getUpcoming(limit);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get event by ID
router.get(
  '/events/:id',
  [param('id').isMongoId(), validate],
  async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findById(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get events by venue
router.get(
  '/events/venue/:venueId',
  [param('venueId').notEmpty(), validate],
  async (req, res) => {
    try {
      const { venueId } = req.params;
      const events = await Event.getByVenue(venueId);

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      console.error('Get venue events error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get events by performer
router.get(
  '/events/performer/:performerId',
  [param('performerId').notEmpty(), validate],
  async (req, res) => {
    try {
      const { performerId } = req.params;
      const events = await Event.getByPerformer(performerId);

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      console.error('Get performer events error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ===== TICKETS =====

// Purchase ticket
router.post(
  '/tickets/purchase',
  [
    body('eventId').isMongoId(),
    body('userId').isMongoId(),
    body('tierId').notEmpty(),
    validate,
  ],
  async (req, res) => {
    try {
      const { eventId, userId, tierId } = req.body;

      // Get event and check availability
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
        });
      }

      if (!event.hasAvailableTickets(tierId)) {
        return res.status(400).json({
          success: false,
          error: 'No tickets available for this tier',
        });
      }

      // Get tier info
      const tier = event.ticketTiers.id(tierId);
      if (!tier) {
        return res.status(404).json({
          success: false,
          error: 'Ticket tier not found',
        });
      }

      // Generate QR code
      const qrCode = await Ticket.generateQRCode(eventId, userId);

      // Create ticket
      const ticket = await Ticket.create({
        eventId,
        userId,
        tierId,
        qrCode,
        purchasePrice: tier.price,
        status: 'ACTIVE',
      });

      // Update event ticket count
      await event.sellTicket(tierId);

      await ticket.populate('eventId');
      await ticket.populate('userId', 'displayName avatarUrl');

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket purchased successfully',
      });
    } catch (error) {
      console.error('Purchase ticket error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get user's tickets
router.get(
  '/tickets/user/:userId',
  [
    param('userId').isMongoId(),
    query('status').optional().isIn(['ACTIVE', 'USED', 'TRANSFERRED', 'CANCELLED']),
    validate,
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      const tickets = await Ticket.getUserTickets(userId, status);

      res.json({
        success: true,
        data: tickets,
        count: tickets.length,
      });
    } catch (error) {
      console.error('Get user tickets error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Transfer ticket
router.post(
  '/tickets/:id/transfer',
  [
    param('id').isMongoId(),
    body('newUserId').isMongoId(),
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newUserId } = req.body;

      const ticket = await Ticket.findById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      }

      const newTicket = await ticket.transferTo(newUserId);
      await newTicket.populate('userId', 'displayName avatarUrl');

      res.json({
        success: true,
        data: newTicket,
        message: 'Ticket transferred successfully',
      });
    } catch (error) {
      console.error('Transfer ticket error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Validate QR code
router.post(
  '/tickets/validate',
  [body('qrCode').isString().notEmpty(), validate],
  async (req, res) => {
    try {
      const { qrCode } = req.body;

      const validation = await Ticket.validateQRCode(qrCode);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
          ticket: validation.ticket,
        });
      }

      res.json({
        success: true,
        data: validation.ticket,
        message: 'Ticket is valid',
      });
    } catch (error) {
      console.error('Validate QR code error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Check in ticket
router.post(
  '/tickets/:id/check-in',
  [
    param('id').isMongoId(),
    body('checkedInBy').isString().notEmpty(),
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { checkedInBy } = req.body;

      const ticket = await Ticket.findById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      }

      await ticket.checkIn(checkedInBy);
      await ticket.populate('eventId');
      await ticket.populate('userId', 'displayName avatarUrl');

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket checked in successfully',
      });
    } catch (error) {
      console.error('Check in ticket error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get event attendance stats
router.get(
  '/tickets/attendance/:eventId',
  [param('eventId').isMongoId(), validate],
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const attendance = await Ticket.getEventAttendance(eventId);

      res.json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      console.error('Get attendance error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ===== GUEST LIST =====

// Add to guest list
router.post(
  '/guest-list',
  [
    body('venueId').notEmpty(),
    body('guestName').isString().notEmpty(),
    body('addedBy').isMongoId(),
    body('eventId').optional().isMongoId(),
    body('guestUserId').optional().isMongoId(),
    body('guestPhone').optional().isString(),
    body('guestEmail').optional().isEmail(),
    body('plusOnes').optional().isInt({ min: 0, max: 10 }),
    body('listType').optional().isIn(['VIP', 'GENERAL', 'MEDIA', 'INDUSTRY', 'COMP']),
    validate,
  ],
  async (req, res) => {
    try {
      const {
        venueId,
        eventId,
        guestUserId,
        guestName,
        guestPhone,
        guestEmail,
        plusOnes = 0,
        addedBy,
        listType = 'GENERAL',
        specialRequests,
        tableNumber,
        notes,
      } = req.body;

      const guestEntry = await GuestList.create({
        venueId,
        eventId,
        guestUserId,
        guestName,
        guestPhone,
        guestEmail,
        plusOnes,
        addedBy,
        listType,
        specialRequests,
        tableNumber,
        notes,
        status: 'CONFIRMED',
      });

      await guestEntry.populate('guestUserId', 'displayName avatarUrl phoneNumber');
      await guestEntry.populate('addedBy', 'displayName');
      if (eventId) {
        await guestEntry.populate('eventId', 'title date');
      }

      res.status(201).json({
        success: true,
        data: guestEntry,
        message: 'Added to guest list successfully',
      });
    } catch (error) {
      console.error('Add to guest list error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get venue guest list
router.get(
  '/guest-list/venue/:venueId',
  [
    param('venueId').notEmpty(),
    query('date').optional().isISO8601(),
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED']),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId } = req.params;
      const { date, status } = req.query;

      const guestList = await GuestList.getVenueList(venueId, date, status);

      res.json({
        success: true,
        data: guestList,
        count: guestList.length,
      });
    } catch (error) {
      console.error('Get venue guest list error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get event guest list
router.get(
  '/guest-list/event/:eventId',
  [
    param('eventId').isMongoId(),
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED']),
    validate,
  ],
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { status } = req.query;

      const guestList = await GuestList.getEventList(eventId, status);

      res.json({
        success: true,
        data: guestList,
        count: guestList.length,
      });
    } catch (error) {
      console.error('Get event guest list error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get user's guest list entries
router.get(
  '/guest-list/user/:userId',
  [param('userId').isMongoId(), validate],
  async (req, res) => {
    try {
      const { userId } = req.params;

      const entries = await GuestList.getUserEntries(userId);

      res.json({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Get user guest list error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Check if user is on guest list
router.get(
  '/guest-list/check',
  [
    query('userId').isMongoId(),
    query('venueId').notEmpty(),
    query('eventId').optional().isMongoId(),
    validate,
  ],
  async (req, res) => {
    try {
      const { userId, venueId, eventId } = req.query;

      const isOnList = await GuestList.isUserOnList(userId, venueId, eventId);

      res.json({
        success: true,
        data: {
          isOnList,
        },
      });
    } catch (error) {
      console.error('Check guest list error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Check in guest
router.post(
  '/guest-list/:id/check-in',
  [
    param('id').isMongoId(),
    body('checkedInBy').isString().notEmpty(),
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { checkedInBy } = req.body;

      const guestEntry = await GuestList.findById(id);
      if (!guestEntry) {
        return res.status(404).json({
          success: false,
          error: 'Guest list entry not found',
        });
      }

      await guestEntry.checkIn(checkedInBy);
      await guestEntry.populate('guestUserId', 'displayName avatarUrl');
      await guestEntry.populate('eventId', 'title date');

      res.json({
        success: true,
        data: guestEntry,
        message: 'Guest checked in successfully',
      });
    } catch (error) {
      console.error('Check in guest error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Cancel guest list entry
router.post(
  '/guest-list/:id/cancel',
  [param('id').isMongoId(), validate],
  async (req, res) => {
    try {
      const { id } = req.params;

      const guestEntry = await GuestList.findById(id);
      if (!guestEntry) {
        return res.status(404).json({
          success: false,
          error: 'Guest list entry not found',
        });
      }

      await guestEntry.cancel();

      res.json({
        success: true,
        data: guestEntry,
        message: 'Guest list entry cancelled',
      });
    } catch (error) {
      console.error('Cancel guest list error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get guest list stats
router.get(
  '/guest-list/stats',
  [
    query('venueId').notEmpty(),
    query('eventId').optional().isMongoId(),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, eventId } = req.query;

      const stats = await GuestList.getStats(venueId, eventId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get guest list stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Mark no-shows for past event (utility endpoint)
router.post(
  '/guest-list/mark-no-shows/:eventId',
  [param('eventId').isMongoId(), validate],
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const count = await GuestList.markNoShows(eventId);

      res.json({
        success: true,
        message: `Marked ${count} guests as no-shows`,
        count,
      });
    } catch (error) {
      console.error('Mark no-shows error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;

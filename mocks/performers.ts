import { Performer } from '@/types';

export const mockPerformers: Performer[] = [
  {
    id: 'performer-1',
    name: 'Sarah Chen',
    stageName: 'DJ Solaris',
    genres: ['House', 'Techno', 'Progressive'],
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    followerCount: 12500,
    totalRevenueGenerated: 47800,
    baseCity: 'New York',
    epkVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'performer-2',
    name: 'Marcus Thompson',
    stageName: 'MC Voltage',
    genres: ['Hip-Hop', 'Trap'],
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    followerCount: 8900,
    totalRevenueGenerated: 32100,
    baseCity: 'New York',
    epkVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'performer-3',
    name: 'Luna Rivera',
    stageName: 'Luna',
    genres: ['R&B', 'Soul'],
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    followerCount: 15200,
    totalRevenueGenerated: 58900,
    baseCity: 'New York',
    epkVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
];

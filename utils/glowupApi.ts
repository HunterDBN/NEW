import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

const BASE = 'https://w99rpvg2jykqme8ytyqjerycckd6z729.app.specular.dev';

// Types
export interface GlowProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  profile_photo: string;
  glow_areas: string;
  instagram_url: string;
  tiktok_url: string;
  pinterest_url: string;
  youtube_url: string;
  is_premium: boolean;
  joined_at: string;
  name: string;
  email: string;
}

export interface GlowPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
  is_saved: boolean;
  author?: {
    username: string;
    profile_photo: string;
    is_premium: boolean;
    name: string;
  };
}

export interface GlowComment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  author?: {
    username: string;
    profile_photo: string;
  };
}

export interface GlowChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_days: number;
  cover_image: string;
  is_premium: boolean;
  created_at: string;
  latest_day?: number;
}

export interface GlowChallengeEntry {
  id: string;
  user_id: string;
  challenge_id: string;
  day_number: number;
  note: string;
  photo_url: string;
  logged_at: string;
}

export interface GlowJournalEntry {
  id: string;
  user_id: string;
  prompt: string;
  response: string;
  mood: string;
  created_at: string;
}

// Profile
export const getMyProfile = () => apiGet(`${BASE}/api/gu/profile`);
export const updateProfile = (data: Partial<GlowProfile>) => apiPut(`${BASE}/api/gu/profile`, data);
export const getUserProfile = (userId: string) => apiGet(`${BASE}/api/gu/profile/${userId}`);

// Posts
export const getPosts = (params?: { category?: string; search?: string }) => {
  const filtered: Record<string, string> = {};
  if (params?.category) filtered.category = params.category;
  if (params?.search) filtered.search = params.search;
  const q = new URLSearchParams(filtered).toString();
  return apiGet(`${BASE}/api/gu/posts${q ? '?' + q : ''}`);
};
export const createPost = (data: { content: string; image_url?: string; category: string }) =>
  apiPost(`${BASE}/api/gu/posts`, data);
export const getPost = (id: string) => apiGet(`${BASE}/api/gu/posts/${id}`);
export const deletePost = (id: string) => apiDelete(`${BASE}/api/gu/posts/${id}`);
export const getUserPosts = (userId: string) => apiGet(`${BASE}/api/gu/posts/user/${userId}`);

// Likes & Comments
export const toggleLike = (postId: string) => apiPost(`${BASE}/api/gu/posts/${postId}/like`, {});
export const getComments = (postId: string) => apiGet(`${BASE}/api/gu/posts/${postId}/comments`);
export const addComment = (postId: string, comment_text: string) =>
  apiPost(`${BASE}/api/gu/posts/${postId}/comments`, { comment_text });
export const deleteComment = (commentId: string) => apiDelete(`${BASE}/api/gu/comments/${commentId}`);

// Saved
export const toggleSave = (postId: string) => apiPost(`${BASE}/api/gu/posts/${postId}/save`, {});
export const getSavedPosts = () => apiGet(`${BASE}/api/gu/saved`);

// Challenges
export const getChallenges = (category?: string) => {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiGet(`${BASE}/api/gu/challenges${q}`);
};
export const getJoinedChallenges = () => apiGet(`${BASE}/api/gu/challenges/joined`);
export const logChallengeEntry = (
  challengeId: string,
  data: { day_number: number; note: string; photo_url?: string }
) => apiPost(`${BASE}/api/gu/challenges/${challengeId}/log`, data);
export const getChallengeEntries = (challengeId: string) =>
  apiGet(`${BASE}/api/gu/challenges/${challengeId}/entries`);

// Journal
export const getJournalPrompt = () => apiGet(`${BASE}/api/gu/journal/prompt`);
export const saveJournalEntry = (data: { prompt: string; response: string; mood: string }) =>
  apiPost(`${BASE}/api/gu/journal`, data);
export const getJournalEntries = () => apiGet(`${BASE}/api/gu/journal`);

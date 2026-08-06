export type ServiceSchedule = {
  id: string;
  title: string;
  day: string;
  date: string;
  time: string;
  location: string;
  speaker?: string;
  featured?: boolean;
  category: string;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  time: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  image: string;
  registration?: boolean;
  registrationOpen?: boolean;
  isPast?: boolean;
};

export type Sermon = {
  id: string;
  slug: string;
  title: string;
  speaker: string;
  date: string;
  verse: string;
  category: string;
  image: string;
  youtubeId?: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
  author: string;
};

export type Ministry = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  image?: string | null;
};

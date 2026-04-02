export interface LessonSection {
  title: string;
  content: string;
}

export interface LessonContent {
  title: string;
  category: string;
  emoji: string;
  introduction: string;
  highlight: {
    text: string;
    label: string;
  };
  practicalExample: {
    title: string;
    content: string;
  };
  howToApplyToday: string[];
  curiosity?: string;
  // Journey mode extra fields
  sections?: LessonSection[];
  keyPoints?: string[];
  nextSteps?: string[];
  isJourneyLesson?: boolean;
}

export interface GenerateLessonRequest {
  subject?: string;
  imageBase64?: string;
  imageMimeType?: string;
  journeyMode?: boolean;
  journeyContext?: {
    day: number;
    totalDays: number;
    journeyTitle: string;
    journeyObjective?: string;
  };
}

export interface GenerateLessonResponse {
  lesson: LessonContent;
  error?: string;
}

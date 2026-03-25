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
}

export interface GenerateLessonRequest {
  subject?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface GenerateLessonResponse {
  lesson: LessonContent;
  error?: string;
}

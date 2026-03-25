"use client";

import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import LessonScreen from "@/components/LessonScreen";
import type { LessonContent } from "@/types/lesson";

type AppScreen = "home" | "lesson";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");

  const handleLessonGenerated = (lesson: LessonContent, subject: string) => {
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setScreen("home");
  };

  const handleNewLesson = () => {
    setScreen("home");
    setCurrentLesson(null);
    setCurrentSubject("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (screen === "lesson" && currentLesson) {
    return (
      <LessonScreen
        lesson={currentLesson}
        subject={currentSubject}
        onBack={handleBack}
        onNewLesson={handleNewLesson}
      />
    );
  }

  return <HomeScreen onLessonGenerated={handleLessonGenerated} />;
}

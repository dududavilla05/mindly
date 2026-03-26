"use client";

import { useState, useEffect } from "react";
import HomeScreen from "@/components/HomeScreen";
import LessonScreen from "@/components/LessonScreen";
import type { LessonContent } from "@/types/lesson";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppScreen = "home" | "lesson";

export interface UserProfile {
  plan: "gratis" | "pro" | "max";
  lessons_today: number;
  last_lesson_date: string;
}

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = carregando
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("plan, lessons_today, last_lesson_date")
      .eq("id", userId)
      .single();

    if (data) {
      const today = new Date().toISOString().split("T")[0];
      // Resetar contador localmente se mudou o dia
      if (data.last_lesson_date !== today) {
        setProfile({ plan: data.plan, lessons_today: 0, last_lesson_date: today });
      } else {
        setProfile(data as UserProfile);
      }
    }
  };

  useEffect(() => {
    let ready = false;

    // getUser() é a fonte de verdade inicial (valida o token no servidor)
    supabase.auth.getUser().then(({ data: { user } }) => {
      ready = true;
      setUser(user);
      if (user) fetchProfile(user.id);
    });

    // onAuthStateChange cuida de login/logout APÓS a inicialização
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ignorar eventos que chegam antes do getUser() resolver
      // para evitar flicker undefined → null → User
      if (!ready) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLessonGenerated = (
    lesson: LessonContent,
    subject: string,
    newLessonsToday?: number
  ) => {
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Atualizar contador local
    if (profile && newLessonsToday !== undefined) {
      setProfile({ ...profile, lessons_today: newLessonsToday });
    }
  };

  const handleBack = () => setScreen("home");

  const handleNewLesson = () => {
    setScreen("home");
    setCurrentLesson(null);
    setCurrentSubject("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = () => {
    setUser(null);
    setProfile(null);
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

  return (
    <HomeScreen
      onLessonGenerated={handleLessonGenerated}
      user={user}
      profile={profile}
      onSignOut={handleSignOut}
    />
  );
}

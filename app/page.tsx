"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import LessonScreen from "@/components/LessonScreen";

// ssr: false elimina completamente a possibilidade de mismatch de hidratação.
// HomeScreen depende de auth/Supabase e nunca se beneficia de SSR.
const HomeScreen = dynamic(() => import("@/components/HomeScreen"), { ssr: false });
import type { LessonContent } from "@/types/lesson";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClientType } from "@/lib/supabase/client";

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
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Supabase client vive apenas no cliente — nunca durante SSR
  const supabaseRef = useRef<SupabaseClientType | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const sb = supabaseRef.current;
    if (!sb) return;

    const { data } = await sb
      .from("profiles")
      .select("plan, lessons_today, last_lesson_date")
      .eq("id", userId)
      .single();

    if (data) {
      const today = new Date().toISOString().split("T")[0];
      if (data.last_lesson_date !== today) {
        setProfile({ plan: data.plan, lessons_today: 0, last_lesson_date: today });
      } else {
        setProfile(data as UserProfile);
      }
    }
  }, []);

  useEffect(() => {
    // Inicializa o Supabase apenas no browser — evita erro de hidratação
    let client: SupabaseClientType;
    try {
      const { createClient } = require("@/lib/supabase/client");
      const result = createClient();
      if (!result) {
        setUser(null);
        return;
      }
      client = result;
    } catch {
      setUser(null);
      return;
    }
    supabaseRef.current = client;

    let ready = false;

    client.auth.getUser().then(({ data: { user } }) => {
      ready = true;
      setUser(user);
      if (user) fetchProfile(user.id);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!ready) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const handleLessonGenerated = (
    lesson: LessonContent,
    subject: string,
    newLessonsToday?: number
  ) => {
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });

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

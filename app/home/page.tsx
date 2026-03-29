"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import LessonScreen from "@/components/LessonScreen";

const HomeScreen = dynamic(() => import("@/components/HomeScreen"), { ssr: false });
import type { LessonContent } from "@/types/lesson";
import type { UserProfile } from "@/app/page";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClientType } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AppScreen = "home" | "lesson";

export default function HomePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    let client: SupabaseClientType;
    try {
      const { createClient } = require("@/lib/supabase/client");
      const result = createClient();
      if (!result) {
        router.replace("/");
        return;
      }
      client = result;
    } catch {
      router.replace("/");
      return;
    }
    supabaseRef.current = client;

    client.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/");
        return;
      }
      setUser(user);
      fetchProfile(user.id);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, router]);

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
    router.replace("/");
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

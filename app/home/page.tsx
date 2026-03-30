"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import LessonScreen from "@/components/LessonScreen";
import HomeScreen from "@/components/HomeScreen";
import Sidebar from "@/components/Sidebar";
import { useHistory } from "@/hooks/useHistory";
import { createClient } from "@/lib/supabase/client";
import type { LessonContent } from "@/types/lesson";
import type { UserProfile } from "@/app/page";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClientType } from "@/lib/supabase/client";

type AppScreen = "home" | "lesson";

export default function HomePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClientType | null>(null);
  const ready = useRef(false);

  const { history, loading: historyLoading } = useHistory(supabase, user?.id);

  const fetchProfile = useCallback(
    async (userId: string, client: SupabaseClientType) => {
      const { data } = await client
        .from("profiles")
        .select("plan, lessons_today, last_lesson_date")
        .eq("id", userId)
        .single();

      if (data) {
        const today = new Date().toISOString().split("T")[0];
        setProfile(
          data.last_lesson_date !== today
            ? { plan: data.plan, lessons_today: 0, last_lesson_date: today }
            : (data as UserProfile)
        );
      }
    },
    []
  );

  useEffect(() => {
    const result = createClient();
    if (!result) { router.replace("/login"); return; }
    const client: SupabaseClientType = result;

    setSupabase(client);

    client.auth.getUser().then(({ data: { user: currentUser } }) => {
      ready.current = true;
      if (!currentUser) { router.replace("/login"); return; }
      setUser(currentUser);
      fetchProfile(currentUser.id, client);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event, session) => {
        // Ignora eventos anteriores ao getUser() para evitar redirect prematuro
        if (!ready.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id, client);
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          router.replace("/");
        }
      }
    );

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

  const handleSelectHistoryLesson = (item: { subject: string; lesson_data: LessonContent }) => {
    setCurrentLesson(item.lesson_data);
    setCurrentSubject(item.subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <div className="flex min-h-screen">
      <Sidebar
        history={history}
        loading={historyLoading}
        onSelectLesson={handleSelectHistoryLesson}
      />

      <main className="flex-1 min-w-0">
        {screen === "lesson" && currentLesson ? (
          <LessonScreen
            lesson={currentLesson}
            subject={currentSubject}
            onBack={handleBack}
            onNewLesson={handleNewLesson}
          />
        ) : (
          <HomeScreen
            onLessonGenerated={handleLessonGenerated}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
          />
        )}
      </main>
    </div>
  );
}

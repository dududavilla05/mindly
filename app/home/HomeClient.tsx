"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import HomeScreen from "@/components/HomeScreen";
import LessonScreen from "@/components/LessonScreen";
import Sidebar from "@/components/Sidebar";
import HistoryDrawer from "@/components/HistoryDrawer";
import { useHistory } from "@/hooks/useHistory";
import type { LessonContent } from "@/types/lesson";
import type { UserProfile } from "@/app/page";
import type { SupabaseClientType } from "@/lib/supabase/client";

interface HomeClientProps {
  initialUser: User;
  initialProfile: UserProfile | null;
}

type AppScreen = "home" | "lesson";

export default function HomeClient({ initialUser, initialProfile }: HomeClientProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Supabase client inicializado via useEffect — nunca roda no servidor
  const [supabase, setSupabase] = useState<SupabaseClientType | null>(null);
  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const { history, loading: historyLoading, refresh: refreshHistory } = useHistory(supabase, user?.id);

  // Detecta apenas sign-out — sem polling, sem getUser() no cliente
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

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
    refreshHistory();
  };

  const handleSelectHistoryLesson = (item: {
    subject: string;
    lesson_data: LessonContent;
  }) => {
    setCurrentLesson(item.lesson_data);
    setCurrentSubject(item.subject);
    setScreen("lesson");
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => setScreen("home");

  const handleNewLesson = () => {
    setScreen("home");
    setCurrentLesson(null);
    setCurrentSubject("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = async () => {
    setUser(null);
    setProfile(null);
    await supabase?.auth.signOut();
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
            onOpenHistory={() => setDrawerOpen(true)}
          />
        ) : (
          <HomeScreen
            onLessonGenerated={handleLessonGenerated}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
            onOpenHistory={() => setDrawerOpen(true)}
          />
        )}
      </main>

      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        history={history}
        loading={historyLoading}
        onSelectLesson={handleSelectHistoryLesson}
      />
    </div>
  );
}

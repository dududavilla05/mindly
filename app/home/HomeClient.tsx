"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import HomeScreen from "@/components/HomeScreen";
import LessonScreen from "@/components/LessonScreen";
import MindMap from "@/components/MindMap";
import Sidebar from "@/components/Sidebar";
import HistoryDrawer from "@/components/HistoryDrawer";
import { useHistory } from "@/hooks/useHistory";
import { useMindMaps } from "@/hooks/useMindMaps";
import type { LessonContent } from "@/types/lesson";
import type { UserProfile } from "@/app/page";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { MindMapItem } from "@/hooks/useMindMaps";
import type { MindMapNode, MindMapEdge } from "@/components/MindMap";

interface HomeClientProps {
  initialUser: User;
  initialProfile: UserProfile | null;
}

type AppScreen = "home" | "lesson" | "mindmap";

export default function HomeClient({ initialUser, initialProfile }: HomeClientProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [mindMapData, setMindMapData] = useState<{ topic: string; nodes: MindMapNode[]; edges: MindMapEdge[] } | null>(null);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [supabase, setSupabase] = useState<SupabaseClientType | null>(null);
  useEffect(() => { setSupabase(createClient()); }, []);

  const { history, loading: historyLoading, refresh: refreshHistory } = useHistory(supabase, user?.id, profile?.plan);
  const { mindMaps, loading: mindMapsLoading, refresh: refreshMindMaps } = useMindMaps(supabase, user?.id, profile?.plan);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const refreshProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const { profile: fresh } = await res.json();
      if (fresh) setProfile(fresh as UserProfile);
    } catch { /* silencioso */ }
  };

  const handleLessonGenerated = (lesson: LessonContent, subject: string) => {
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshHistory();
    refreshProfile();
    window.location.reload();
  };

  const handleSelectHistoryLesson = (item: { subject: string; lesson_data: LessonContent }) => {
    setCurrentLesson(item.lesson_data);
    setCurrentSubject(item.subject);
    setScreen("lesson");
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenMindMap = (data?: { topic: string; nodes: MindMapNode[]; edges: MindMapEdge[] }) => {
    setMindMapData(data ?? null);
    setScreen("mindmap");
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectMindMap = (item: MindMapItem) => {
    handleOpenMindMap({ topic: item.title, nodes: item.nodes, edges: item.edges });
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
        mindMaps={mindMaps}
        mindMapsLoading={mindMapsLoading}
        onSelectMindMap={handleSelectMindMap}
        onNewMindMap={() => handleOpenMindMap()}
        plan={profile?.plan}
      />

      <main className="flex-1 min-w-0">
        {screen === "lesson" && currentLesson ? (
          <LessonScreen
            lesson={currentLesson}
            subject={currentSubject}
            onBack={handleBack}
            onNewLesson={handleNewLesson}
            onOpenHistory={() => setDrawerOpen(true)}
            plan={profile?.plan}
          />
        ) : screen === "mindmap" ? (
          <MindMap
            plan={profile?.plan}
            userId={user?.id}
            onBack={handleBack}
            initialTopic={mindMapData?.topic ?? ""}
            initialNodes={mindMapData?.nodes}
            initialEdges={mindMapData?.edges}
            onSaved={refreshMindMaps}
          />
        ) : (
          <HomeScreen
            onLessonGenerated={handleLessonGenerated}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
            onOpenHistory={() => setDrawerOpen(true)}
            onOpenMindMap={() => handleOpenMindMap()}
          />
        )}
      </main>

      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        history={history}
        loading={historyLoading}
        onSelectLesson={handleSelectHistoryLesson}
        mindMaps={mindMaps}
        mindMapsLoading={mindMapsLoading}
        onSelectMindMap={handleSelectMindMap}
        onNewMindMap={() => handleOpenMindMap()}
        plan={profile?.plan}
      />
    </div>
  );
}

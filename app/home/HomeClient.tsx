"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import HomeScreen from "@/components/HomeScreen";
import LessonScreen from "@/components/LessonScreen";
import MindMap from "@/components/MindMap";
import Journey from "@/components/Journey";
import Sidebar from "@/components/Sidebar";
import HistoryDrawer from "@/components/HistoryDrawer";
import { useHistory } from "@/hooks/useHistory";
import { useMindMaps } from "@/hooks/useMindMaps";
import { useJourneys } from "@/hooks/useJourneys";
import type { LessonContent } from "@/types/lesson";
import type { UserProfile } from "@/app/page";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { MindMapItem } from "@/hooks/useMindMaps";
import type { JourneyItem } from "@/hooks/useJourneys";
import type { MindMapNode, MindMapEdge } from "@/components/MindMap";

interface HomeClientProps {
  initialUser: User;
  initialProfile: UserProfile | null;
}

type AppScreen = "home" | "lesson" | "mindmap" | "journey";

export default function HomeClient({ initialUser, initialProfile }: HomeClientProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<AppScreen>("home");
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [mindMapData, setMindMapData] = useState<{ topic: string; nodes: MindMapNode[]; edges: MindMapEdge[] } | null>(null);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"licoes" | "mapas" | "jornadas">("licoes");
  const [mapKey, setMapKey] = useState(0);
  const [journeyKey, setJourneyKey] = useState(0);
  const [currentJourney, setCurrentJourney] = useState<JourneyItem | null>(null);
  const [currentJourneyId, setCurrentJourneyId] = useState<string | null>(null);
  const [returnScreen, setReturnScreen] = useState<AppScreen>("home");
  const [journeyContext, setJourneyContext] = useState<{ day: number; journeyTitle: string; totalDays: number } | null>(null);
  const [lessonFromJourney, setLessonFromJourney] = useState(false);

  const [supabase, setSupabase] = useState<SupabaseClientType | null>(null);
  useEffect(() => { setSupabase(createClient()); }, []);

  const { history, loading: historyLoading, refresh: refreshHistory } = useHistory(supabase, user?.id, profile?.plan);
  const { mindMaps, loading: mindMapsLoading, refresh: refreshMindMaps } = useMindMaps(supabase, user?.id, profile?.plan);
  const { journeys, loading: journeysLoading, refresh: refreshJourneys } = useJourneys(supabase, user?.id, profile?.plan);

  const MAP_LIMITS: Record<string, number> = { gratis: 3, pro: 10 };
  const today = new Date().toISOString().slice(0, 10);
  const mapsToday = profile?.last_map_date === today ? (profile?.maps_today ?? 0) : 0;
  const mapsLimitReached = profile?.plan !== "max" && mapsToday >= (MAP_LIMITS[profile?.plan ?? "gratis"] ?? 3);
  const mapsLimit = profile?.plan === "max" ? null : (MAP_LIMITS[profile?.plan ?? "gratis"] ?? 3);

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
    setReturnScreen("home");
    setLessonFromJourney(false);
    setJourneyContext(null);
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshHistory();
    refreshProfile();
  };

  const handleLessonFromJourney = (lesson: LessonContent, subject: string, journeyDay?: number, journeyTitle?: string, journeyTotalDays?: number) => {
    setReturnScreen("journey");
    setLessonFromJourney(true);
    setJourneyContext(journeyDay != null && journeyTitle ? { day: journeyDay, journeyTitle, totalDays: journeyTotalDays ?? 0 } : null);
    setCurrentLesson(lesson);
    setCurrentSubject(subject);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshHistory();
  };

  const handleSelectHistoryLesson = (item: { subject: string; lesson_data: LessonContent }) => {
    setCurrentLesson(item.lesson_data);
    setCurrentSubject(item.subject);
    setReturnScreen("home");
    setJourneyContext(null);
    setLessonFromJourney(false);
    setScreen("lesson");
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenMindMap = (data?: { topic: string; nodes: MindMapNode[]; edges: MindMapEdge[] }) => {
    setMindMapData(data ?? null);
    setMapKey(k => k + 1);
    setScreen("mindmap");
    setDrawerOpen(false);
    setSidebarTab("mapas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectMindMap = (item: MindMapItem) => {
    handleOpenMindMap({ topic: item.title, nodes: item.nodes, edges: item.edges });
  };

  const handleBack = () => {
    const target = returnScreen;
    setReturnScreen("home");
    if (target === "journey") {
      setJourneyKey(k => k + 1); // force remount so Journey reloads fresh data from Supabase
    }
    setScreen(target);
    setSidebarTab(target === "journey" ? "jornadas" : "licoes");
  };

  const handleOpenJourney = (data?: JourneyItem) => {
    setCurrentJourney(data ?? null);
    setCurrentJourneyId(data?.id ?? null);
    setJourneyKey(k => k + 1);
    setScreen("journey");
    setDrawerOpen(false);
    setSidebarTab("jornadas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        journeys={journeys}
        journeysLoading={journeysLoading}
        onSelectJourney={handleOpenJourney}
        onNewJourney={() => handleOpenJourney()}
        plan={profile?.plan}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        mapsLimitReached={mapsLimitReached}
        mapsLimit={mapsLimit}
        mapsToday={mapsToday}
      />

      <main className="flex-1 min-w-0">
        {screen === "lesson" && currentLesson ? (
          <div className="animate-lesson-enter">
            <LessonScreen
              lesson={currentLesson}
              subject={currentSubject}
              onBack={handleBack}
              onNewLesson={lessonFromJourney ? handleBack : handleNewLesson}
              onOpenHistory={() => setDrawerOpen(true)}
              plan={profile?.plan}
              journeyContext={journeyContext}
            />
          </div>
        ) : screen === "mindmap" ? (
          <MindMap
            key={mapKey}
            plan={profile?.plan}
            userId={user?.id}
            onBack={handleBack}
            initialTopic={mindMapData?.topic ?? ""}
            initialNodes={mindMapData?.nodes}
            initialEdges={mindMapData?.edges}
            onSaved={refreshMindMaps}
            mapsLimitReached={mapsLimitReached}
            mapsLimit={mapsLimit}
            mapsToday={mapsToday}
            onMapGenerated={refreshProfile}
          />
        ) : screen === "journey" ? (
          <Journey
            key={journeyKey}
            plan={profile?.plan}
            userId={user?.id}
            supabase={supabase}
            onBack={handleBack}
            initialJourney={currentJourney}
            journeyId={currentJourneyId ?? undefined}
            onJourneyCreated={setCurrentJourneyId}
            onLessonGenerated={handleLessonFromJourney}
            onSaved={refreshJourneys}
          />
        ) : (
          <HomeScreen
            onLessonGenerated={handleLessonGenerated}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
            onOpenHistory={() => setDrawerOpen(true)}
            onOpenMindMap={() => handleOpenMindMap()}
            onOpenJourney={() => handleOpenJourney()}
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
        journeys={journeys}
        journeysLoading={journeysLoading}
        onSelectJourney={handleOpenJourney}
        onNewJourney={() => handleOpenJourney()}
        plan={profile?.plan}
        mapsLimitReached={mapsLimitReached}
        mapsLimit={mapsLimit}
        mapsToday={mapsToday}
      />
    </div>
  );
}

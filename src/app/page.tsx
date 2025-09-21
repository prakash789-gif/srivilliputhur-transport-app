"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Bus, Clock, Home, LocateFixed, User, RouteIcon as Route, Bell, Languages, Send, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import OSMMap from "@/components/map/osm-map";

// Simple i18n dictionary (English / Tamil)
const DICT = {
  en: {
    appTitle: "TN Gamyam",
    subTitle: "",
    language: "Language",
    tabs: { home: "Home", nearby: "Nearby", tracks: "Tracks", profile: "Profile" },
    features: "Key Features",
    f1: "Live bus tracking with ETAs",
    f2: "Nearby stops & routes",
    f3: "Temple-route alerts (Andal Temple)",
    f4: "Offline-friendly UI",
    overviewCTA: "Explore routes",
    mapTitle: "Live Map (Mock)",
    routesTitle: "Active Routes",
    eta: "ETA",
    mins: "mins",
    occupancy: "Occupancy",
    stopFinder: "Nearby Stops",
    useLocation: "Use my location",
    searchStop: "Search stops",
    distance: "Distance",
    servedBy: "Served by",
    profileTitle: "Your Profile",
    tripHistory: "Recent Trips",
    preferences: "Preferences",
    name: "Name",
    email: "Email",
    phone: "Phone",
    save: "Save",
    alerts: "Temple alerts",
    notifications: "Notifications",
    languagePref: "App language",
    feedback: "Feedback",
    message: "Message",
    submit: "Submit",
    noResults: "No results",
    focusNearest: "Focus nearest"
  },
  ta: {
    appTitle: "ശ്രീവில்லிபுத்தூர் பேருந்து சேவை",
    subTitle: "",
    language: "மொழி",
    tabs: { home: "முகப்பு", nearby: "அருகில்", tracks: "பஸ்கள்", profile: "சுயவிவரம்" },
    features: "முக்கிய அம்சங்கள்",
    f1: "நேரடி பேருந்து கண்காணிப்பு & ETA",
    f2: "அருகிலுள்ள நிறுத்தங்கள்",
    f3: "ஆண்டாள் கோவில் வழி எச்சரிக்கை",
    f4: "ஆஃப்லைன் நட்பு UI",
    overviewCTA: "ரூட்டுகளை காண",
    mapTitle: "நேரடி வரைபடம் (Mock)",
    routesTitle: "இயங்கும் பாதைகள்",
    eta: "வருகை",
    mins: "நிமி",
    occupancy: "நிரப்பு",
    stopFinder: "அருகிலுள்ள நிறுத்தங்கள்",
    useLocation: "என் இருப்பிடம்",
    searchStop: "நிறுத்தங்களைத் தேடுங்கள்",
    distance: "தூரம்",
    servedBy: "இவை சேவை",
    profileTitle: "உங்கள் சுயவிவரம்",
    tripHistory: "சமீப பயணங்கள்",
    preferences: "விருப்பங்கள்",
    name: "பெயர்",
    email: "மின்னஞ்சல்",
    phone: "தொலைபேசி",
    save: "சேமிக்க",
    alerts: "கோவில் எச்சரிக்கைகள்",
    notifications: "அறிவிப்புகள்",
    languagePref: "பயன்பாட்டு மொழி",
    feedback: "கருத்து",
    message: "செய்தி",
    submit: "சமர்ப்பிக்க",
    noResults: "முடிவுகள் இல்லை",
    focusNearest: "அருகிலுள்ளதை மட்டும்"
  }
};

type Lang = keyof typeof DICT;

type RouteItem = {
  id: string;
  code: string;
  name: string;
  from: string;
  to: string;
  etaMins: number;
  occupancy: number; // 0-100
  status: "on_time" | "delayed";
};

type Stop = {
  id: string;
  name: string;
  distanceKm: number;
  servedBy: string[]; // route codes
  lat?: number;
  lng?: number;
};

const MOCK_ROUTES: RouteItem[] = [
{ id: "r1", code: "SVP-01", name: "Town Bus - Sethunarayanapuram", from: "SVP Bus Stand", to: "Sethunarayanapuram", etaMins: 8, occupancy: 42, status: "on_time" },
{ id: "r2", code: "SVP-05", name: "Town Bus - Vathirairuppu", from: "SVP Bus Stand", to: "Vathirairuppu", etaMins: 14, occupancy: 67, status: "delayed" },
{ id: "r3", code: "MDU-210", name: "Rajapalayam ↔ Srivilliputhur", from: "Rajapalayam", to: "SVP Bus Stand", etaMins: 5, occupancy: 54, status: "on_time" },
{ id: "r4", code: "TEN-32", name: "Theni Express", from: "Theni", to: "SVP Bus Stand", etaMins: 26, occupancy: 38, status: "on_time" }];


const MOCK_STOPS: Stop[] = [
{ id: "s1", name: "SVP Bus Stand", distanceKm: 0.4, servedBy: ["SVP-01", "SVP-05", "MDU-210", "TEN-32"], lat: 9.5124, lng: 77.6358 },
{ id: "s2", name: "Andal Temple East Gate", distanceKm: 1.1, servedBy: ["SVP-01", "SVP-05"], lat: 9.509, lng: 77.633 },
{ id: "s3", name: "Sethunarayanapuram Stop", distanceKm: 3.8, servedBy: ["SVP-01"], lat: 9.5235, lng: 77.671 },
{ id: "s4", name: "Vathirairuppu Junction", distanceKm: 7.2, servedBy: ["SVP-05"], lat: 9.583, lng: 77.561 },
{ id: "s5", name: "Krishnankovil Bus Stop", distanceKm: 12.4, servedBy: ["SVP-05", "MDU-210"], lat: 9.4906, lng: 77.6306 },
{ id: "s6", name: "Kalasalingam College Bus Stop", distanceKm: 14.8, servedBy: ["SVP-05"], lat: 9.576, lng: 77.708 }
];


export default function HomePage() {
  const [lang, setLang] = useState<Lang>("ta");
  const t = DICT[lang];

  const [tab, setTab] = useState<string>("home");
  const [routes, setRoutes] = useState<RouteItem[]>(MOCK_ROUTES);
  const [stopQuery, setStopQuery] = useState("");
  const [geoAllowed, setGeoAllowed] = useState<boolean | null>(null);
  const [currentLoc, setCurrentLoc] = useState<{lat: number;lng: number;} | null>(null);
  const [feedback, setFeedback] = useState("");
  const { profile, logout } = useAuth();
  const [helpline, setHelpline] = useState<string>("");
  const [focusNearest, setFocusNearest] = useState(false);

  // Live buses (from API) and map centers
  const [liveBuses, setLiveBuses] = useState<Array<{id:string;code:string;lat:number;lng:number;routes:string[];userReports?:{lat:number;lng:number;ts:number}[]}> | null>(null);
  const [nearbyCenter, setNearbyCenter] = useState<{lat:number;lng:number} | null>(null);

  // Map center: Srivilliputhur Bus Stand vicinity
  const MAP_CENTER = { lat: 9.5124, lng: 77.6358 };
  const stopsForMap = useMemo(() => MOCK_STOPS.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })), []);

  // Derive buses for map (prefer latest user report if available) and attach ETA
  const busesForMap = useMemo(() => {
    if (!liveBuses) return undefined;
    return liveBuses.map((b) => {
      const latest = (b.userReports || []).slice().sort((a,b)=>b.ts-a.ts)[0];
      const lat = latest?.lat ?? b.lat;
      const lng = latest?.lng ?? b.lng;
      const routeMatch = routes.find((r)=> r.code === b.code);
      return { id: b.id, code: b.code, lat, lng, etaMins: routeMatch?.etaMins } as any;
    });
  }, [liveBuses, routes]);

  // Multi-segment polylines between key stops by route
  const polylines = useMemo(() => {
    const byId = Object.fromEntries(MOCK_STOPS.map(s=>[s.id,s] as const));
    const pts = (ids: string[]) => ids
      .map((id)=> byId[id])
      .filter((s)=> s && s.lat && s.lng)
      .map((s)=> ({ lat: s!.lat as number, lng: s!.lng as number }));

    return [
      { id: "SVP-05", color: "#3b82f6", points: pts(["s1","s2","s5","s6"]) },
      { id: "SVP-01", color: "#f59e0b", points: pts(["s1","s2","s3"]) },
      { id: "MDU-210", color: "#10b981", points: pts(["s5","s1"]) },
      { id: "TEN-32", color: "#8b5cf6", points: pts(["s4","s1"]) },
    ].filter(pl => pl.points.length >= 2);
  }, []);

  useEffect(() => {
    // fetch helpline number for call button
    fetch("/api/tele/number").then(r => r.json()).then((d) => {
      if (d?.phone) setHelpline(d.phone as string);
    }).catch(() => {});
  }, []);

  // Poll live buses
  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        const res = await fetch("/api/buses/live", { cache: "no-store" });
        const data = await res.json();
        if (data?.buses) setLiveBuses(data.buses);
      } catch {}
      timer = setTimeout(load, 10000);
    };
    load();
    return () => clearTimeout(timer);
  }, []);

  // Simulate live ETA updates
  useEffect(() => {
    const id = setInterval(() => {
      setRoutes((prev) =>
      prev.map((r) => {
        let delta = Math.random() < 0.5 ? -1 : 1;
        const newEta = Math.max(1, r.etaMins + delta);
        const newOcc = Math.min(100, Math.max(5, r.occupancy + (Math.random() < 0.5 ? -2 : 2)));
        return { ...r, etaMins: newEta, occupancy: newOcc };
      })
      );
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Filter stops
  const filteredStops = useMemo(() => {
    const q = stopQuery.trim().toLowerCase();
    const arr = q ?
    MOCK_STOPS.filter((s) => s.name.toLowerCase().includes(q)) :
    MOCK_STOPS;
    return arr.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [stopQuery]);

  const onUseLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoAllowed(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoAllowed(true);
        setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeoAllowed(false),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // When switching to Nearby with location available, auto-center
  useEffect(() => {
    if (tab === "nearby") {
      setNearbyCenter(currentLoc ?? MAP_CENTER);
    }
  }, [tab, currentLoc]);

  // Handle clicking a stop item (centers map and for Krishnankovil finds nearest bus/user report)
  const handleStopClick = (s: Stop) => {
    setTab("nearby");
    // If it's Krishnankovil, try to find nearest serving bus using userReports when available
    if (s.name.toLowerCase().includes("krishnankovil") && liveBuses && s.lat && s.lng) {
      const serving = liveBuses.filter(b => b.routes?.some(rc => s.servedBy.includes(rc)));
      let best: {lat:number;lng:number;d:number} | null = null;
      for (const b of serving) {
        const latest = (b.userReports||[]).slice().sort((a,b)=>b.ts-a.ts)[0];
        const cand = latest ? { lat: latest.lat, lng: latest.lng } : { lat: b.lat, lng: b.lng };
        const d = haversine(s.lat, s.lng, cand.lat, cand.lng);
        if (!best || d < best.d) best = { ...cand, d };
      }
      if (best) {
        setNearbyCenter({ lat: best.lat, lng: best.lng });
        return;
      }
    }
    // fallback: center to stop itself or default
    if (s.lat && s.lng) setNearbyCenter({ lat: s.lat, lng: s.lng });
    else setNearbyCenter(MAP_CENTER);
  };

  // Compute nearest stop/bus for focus mode
  const nearestStopForMap = useMemo(() => {
    if (!currentLoc) return null;
    let best: { id:string; name:string; lat:number; lng:number } | null = null;
    for (const s of MOCK_STOPS) {
      if (s.lat == null || s.lng == null) continue;
      const d = haversine(currentLoc.lat, currentLoc.lng, s.lat, s.lng);
      if (!best || d < haversine(currentLoc.lat, currentLoc.lng, best.lat, best.lng)) {
        best = { id: s.id, name: s.name, lat: s.lat, lng: s.lng };
      }
    }
    return best;
  }, [currentLoc]);

  const nearestBusForMap = useMemo(() => {
    if (!currentLoc || !busesForMap?.length) return null;
    let best: any = null;
    for (const b of busesForMap) {
      const d = haversine(currentLoc.lat, currentLoc.lng, b.lat, b.lng);
      if (!best || d < haversine(currentLoc.lat, currentLoc.lng, best.lat, best.lng)) best = b;
    }
    return best;
  }, [currentLoc, busesForMap]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Bus className="size-6" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight !whitespace-pre-line">{t.appTitle}</h1>
            <p className="text-sm text-muted-foreground !whitespace-pre-line">{t.subTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {helpline && (
              <a href={`tel:${helpline}`} className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="gap-2">
                  <PhoneCall className="size-4" /> Call AI
                </Button>
              </a>
            )}
            {/* Auth controls */}
            {profile ? (
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="max-w-[140px] truncate">{profile.name || profile.phone}</Badge>
                <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
            )}
            <Languages className="size-4 text-muted-foreground" />
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t.language} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Mobile quick actions */}
        <div className="sm:hidden mx-auto max-w-6xl px-4 pb-2 flex items-center justify-between gap-2">
          {helpline ? (
            <a href={`tel:${helpline}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-2"><PhoneCall className="size-4"/> Call AI</Button>
            </a>
          ) : <span />}
          {profile ? (
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          ) : (
            <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <div className="hidden sm:block">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="home">{t.tabs.home}</TabsTrigger>
            <TabsTrigger value="nearby">{t.tabs.nearby}</TabsTrigger>
            <TabsTrigger value="tracks">{t.tabs.tracks}</TabsTrigger>
            <TabsTrigger value="profile">{t.tabs.profile}</TabsTrigger>
          </TabsList>
        </div>

        {/* HOME */}
        <TabsContent value="home" className="space-y-6">
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{t.features}</CardTitle>
                <CardDescription>{t.subTitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FeatureItem icon={<Clock className="size-4" />} text={t.f1} />
                <FeatureItem icon={<MapPin className="size-4" />} text={t.f2} />
                <FeatureItem icon={<Bell className="size-4" />} text={t.f3} />
                <FeatureItem icon={<Home className="size-4" />} text={t.f4} />
                <Button className="mt-3" onClick={() => setTab("tracks")}>{t.overviewCTA}</Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>{t.mapTitle}</CardTitle>
                <CardDescription>Srivilliputhur — Andal Temple vicinity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden border bg-muted">
                  <div className="absolute inset-0">
                    <OSMMap center={MAP_CENTER} stops={stopsForMap} currentLoc={currentLoc} buses={busesForMap} polylines={polylines} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{t.routesTitle}</CardTitle>
                <CardDescription>TNSTC Madurai Division — Mock feed</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                 {routes.map((r) =>
                <RouteCard key={r.id} r={r} t={t} />
                )}
               </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* NEARBY */}
        <TabsContent value="nearby" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2"><LocateFixed className="size-5" /> {t.stopFinder}</CardTitle>
              <CardDescription>Find stops around you</CardDescription>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input value={stopQuery} onChange={(e) => setStopQuery(e.target.value)} placeholder={t.searchStop} />
                </div>
                <Button variant="secondary" onClick={onUseLocation}>
                  <LocateFixed className="size-4 mr-2" /> {t.useLocation}
                </Button>
                <Button variant={focusNearest ? "default" : "outline"} onClick={() => {
                  if (!currentLoc) onUseLocation();
                  setFocusNearest((v)=>!v);
                }} className="whitespace-nowrap">
                  {t.focusNearest}
                  <Badge variant="secondary" className="ml-2">{focusNearest ? "ON" : "OFF"}</Badge>
                </Button>
              </div>
              {geoAllowed === false &&
                <p className="text-sm text-destructive">Location access denied. Showing approximate distances.</p>
              }
            </CardHeader>
            <CardContent className="grid gap-3">
              {/* Map on Nearby with auto-zoom to user location */}
              <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden border bg-muted">
                <div className="absolute inset-0">
                  <OSMMap center={nearbyCenter ?? (currentLoc ?? MAP_CENTER)} stops={(focusNearest && nearestStopForMap) ? [nearestStopForMap] : stopsForMap} currentLoc={currentLoc} buses={(focusNearest && nearestBusForMap) ? [nearestBusForMap] : busesForMap} polylines={polylines} />
                </div>
              </div>

              {filteredStops.length === 0 &&
                <p className="text-sm text-muted-foreground">{t.noResults}</p>
              }
              {filteredStops.map((s) =>
                <div key={s.id} className="p-3 rounded-md border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2"><MapPin className="size-4" /> {s.name}</div>
                      <div className="text-sm text-muted-foreground">{t.distance}: {formatDistance(s.distanceKm, currentLoc)}</div>
                      <div className="text-xs text-muted-foreground">{t.servedBy}: {s.servedBy.join(", ")}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleStopClick(s)}>
                      <Route className="size-4 mr-1" /> View on map
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRACKS */}
        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bus className="size-5" /> {t.routesTitle}</CardTitle>
              <CardDescription>Live ETAs refresh every few seconds</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {routes.map((r) =>
              <RouteCard key={r.id} r={r} t={t} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="size-5" /> {t.profileTitle}</CardTitle>
              <CardDescription>{t.tripHistory}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[routes[0], routes[1], routes[2]].map((r, idx) =>
              <div key={r.id + idx} className="flex items-center justify-between gap-2 p-3 border rounded-md">
                  <div className="space-y-0.5">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.from} → {r.to}</div>
                  </div>
                  <Badge variant="secondary">{t.eta}: {r.etaMins} {t.mins}</Badge>
                </div>
              )}
              <Separator />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">{t.name}</label>
                  <Input id="name" placeholder={t.name} defaultValue="Arun" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">{t.email}</label>
                  <Input id="email" type="email" placeholder="you@example.com" defaultValue="arun@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">{t.phone}</label>
                  <Input id="phone" type="tel" placeholder="+91 90000 00000" defaultValue={profile?.phone || ""} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium" htmlFor="feedback">{t.feedback}</label>
                  <Textarea id="feedback" placeholder={t.message} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!feedback.trim()} onClick={() => setFeedback("")}> <Send className="size-4 mr-1" /> {t.submit}</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.preferences}</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.languagePref}</label>
                <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ta">தமிழ்</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center gap-2"><Bell className="size-4" /> {t.alerts}</div>
                  <div className="text-xs text-muted-foreground">Andal Temple procession route alerts</div>
                </div>
                <Badge variant="secondary">ON</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center gap-2"><Bell className="size-4" /> {t.notifications}</div>
                  <div className="text-xs text-muted-foreground">General service notifications</div>
                </div>
                <Badge variant="secondary">ON</Badge>
              </div>
              <Button className="w-full">{t.save}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Tabbar (mobile) */}
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto max-w-6xl grid grid-cols-4">
          <TabButton icon={<Home className="size-5" />} label={t.tabs.home} active={tab === "home"} onClick={() => setTab("home")} />
          <TabButton icon={<MapPin className="size-5" />} label={t.tabs.nearby} active={tab === "nearby"} onClick={() => setTab("nearby")} />
          <TabButton icon={<Bus className="size-5" />} label={t.tabs.tracks} active={tab === "tracks"} onClick={() => setTab("tracks")} />
          <TabButton icon={<User className="size-5" />} label={t.tabs.profile} active={tab === "profile"} onClick={() => setTab("profile")} />
        </div>
      </nav>
    </div>);

}

function FeatureItem({ icon, text }: {icon: React.ReactNode;text: string;}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="size-7 grid place-items-center rounded-md border bg-card">{icon}</div>
      <span>{text}</span>
    </div>);

}

function RouteCard({ r, t }: {r: RouteItem;t: any;}) {
  return (
    <div className="p-3 rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{r.code}</Badge>
            <span className="font-medium truncate">{r.name}</span>
          </div>
          <div className="text-xs text-muted-foreground">{r.from} → {r.to}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold flex items-center justify-end gap-1"><Clock className="size-4" /> {t.eta}: {r.etaMins} {t.mins}</div>
          <div className="text-xs text-muted-foreground">{t.occupancy}: {r.occupancy}%</div>
          <div className="text-xs">
            {r.status === "on_time" ?
            <span className="text-emerald-600 dark:text-emerald-400">On time</span> :

            <span className="text-amber-600 dark:text-amber-400">Delayed</span>
            }
          </div>
        </div>
      </div>
    </div>);

}

function TabButton({ icon, label, active, onClick }: {icon: React.ReactNode;label: string;active: boolean;onClick: () => void;}) {
  return (
    <button
      className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
      onClick={onClick}
      aria-pressed={active}>

      {icon}
      <span>{label}</span>
    </button>);

}

function formatDistance(km: number, _loc: {lat: number;lng: number;} | null) {
  // If we had current location, we could adjust; for now just format
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Haversine distance in meters
function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371000; // m
  const toRad = (x:number)=> x*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}
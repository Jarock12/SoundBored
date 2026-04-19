"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../utils/supabase/supabaseClient";
import { useAuth } from "../app/context/AuthProvider";

// Nav is 64px tall. Staff lines centered symmetrically: 16px above, 16px below.
const STAFF_Y = [16, 24, 32, 40, 48] as const;

const TRAVELLERS = [
  { char: "♩", y: STAFF_Y[0], dur: 31, delay: 0 },
  { char: "♪", y: STAFF_Y[2], dur: 23, delay: -10 },
  { char: "♫", y: STAFF_Y[4], dur: 38, delay: -19 },
  { char: "♬", y: STAFF_Y[1], dur: 27, delay: -6 },
] as const;

const RIPPLE_NOTES = ["♩", "♪", "♫", "♬"] as const;

type Ripple = { id: number; x: number; note: string; dir: 1 | -1; y: number };
type StringVibe = { amp: number; startTime: number };

let _rid = 0;

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [navUsername, setNavUsername] = useState<string | null>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const navRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const navWidthRef = useRef(1440);
  const rafRef = useRef<number>(0);
  const stringVibeRef = useRef<(StringVibe | null)[]>([null, null, null, null, null]);
  const isDraggingRef = useRef(false);
  const lastCursorYRef = useRef<number | null>(null);
  const staffGlowingRef = useRef(false);

  useEffect(() => {
    if (!user) { setNavUsername(null); return; }
    supabase.from("profiles").select("username").eq("id", user.id).single()
      .then(({ data }) => setNavUsername(data?.username ?? null));
  }, [user]);

  // Track nav width for accurate SVG path coordinates
  useEffect(() => {
    const update = () => {
      if (navRef.current) navWidthRef.current = navRef.current.offsetWidth;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const animateStrings = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const W = navWidthRef.current;
    const now = performance.now();
    let anyActive = false;

    for (let i = 0; i < 5; i++) {
      const vibe = stringVibeRef.current[i];
      const path = svg.children[i] as SVGPathElement;
      const baseY = STAFF_Y[i];

      if (!vibe) {
        path.setAttribute("d", `M 0 ${baseY} H 9999`);
        path.setAttribute("stroke", staffGlowingRef.current ? "rgba(74,222,128,0.32)" : "rgba(255,255,255,0.14)");
        continue;
      }

      const elapsed = (now - vibe.startTime) / 1000;
      const amp = vibe.amp * Math.exp(-elapsed * 3.5);

      if (amp < 0.25) {
        stringVibeRef.current[i] = null;
        path.setAttribute("d", `M 0 ${baseY} H 9999`);
        path.setAttribute("stroke", staffGlowingRef.current ? "rgba(74,222,128,0.32)" : "rgba(255,255,255,0.14)");
        continue;
      }

      anyActive = true;
      // Standing wave: fundamental mode shape × oscillation × decay
      const omega = 12;
      const oscillation = Math.sin(omega * elapsed);
      const N = 80;
      let d = `M 0 ${baseY}`;
      for (let j = 1; j <= N; j++) {
        const x = (j / N) * W;
        const shape = Math.sin(Math.PI * x / W);
        const y = baseY + amp * shape * oscillation;
        d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
      }
      path.setAttribute("d", d);
      // Brighten the string while vibrating
      const glow = Math.min(0.9, 0.45 + (amp / vibe.amp) * 0.45);
      path.setAttribute("stroke", `rgba(74,222,128,${glow.toFixed(2)})`);
    }

    if (anyActive) {
      rafRef.current = requestAnimationFrame(animateStrings);
    }
  }, []);

  const pluckString = useCallback((index: number) => {
    stringVibeRef.current[index] = { amp: 7, startTime: performance.now() };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateStrings);
  }, [animateStrings]);

  const handleNavMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastCursorYRef.current = e.clientY - rect.top;
  }, []);

  const handleNavMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect) return;
    const curY = e.clientY - rect.top;
    const prevY = lastCursorYRef.current ?? curY;

    for (let i = 0; i < STAFF_Y.length; i++) {
      const sy = STAFF_Y[i];
      if ((prevY < sy && curY >= sy) || (prevY > sy && curY <= sy)) {
        pluckString(i);
      }
    }

    lastCursorYRef.current = curY;
  }, [pluckString]);

  const handleNavMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    lastCursorYRef.current = null;
  }, []);

  const spawnRipple = useCallback((e: React.MouseEvent) => {
    const x = e.clientX - (navRef.current?.getBoundingClientRect().left ?? 0);
    const batch: Ripple[] = [];
    for (let i = 0; i < 3; i++) {
      const note = RIPPLE_NOTES[Math.floor(Math.random() * RIPPLE_NOTES.length)];
      const y = STAFF_Y[Math.floor(Math.random() * STAFF_Y.length)];
      batch.push(
        { id: ++_rid, x, note, dir: 1, y },
        { id: ++_rid, x, note: RIPPLE_NOTES[Math.floor(Math.random() * RIPPLE_NOTES.length)], dir: -1, y: STAFF_Y[Math.floor(Math.random() * STAFF_Y.length)] },
      );
    }
    setRipples(p => [...p, ...batch]);
    const ids = batch.map(r => r.id);
    setTimeout(() => setRipples(p => p.filter(r => !ids.includes(r.id))), 600);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    spawnRipple(e);
    await supabase.auth.signOut();
    router.push("/");
  };

  if (pathname === "/login" || pathname === "/signup") return null;

  const staffGlowing = hoveredHref !== null;
  staffGlowingRef.current = staffGlowing;

  const links = [
    { href: "/feed", label: "Feed" },
    { href: "/users", label: "Find Users" },
    { href: "/rate", label: "Rate a Song" },
    ...(navUsername ? [{ href: `/profile/${navUsername}`, label: "Profile" }] : []),
  ];

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-[50] overflow-hidden select-none"
      style={{
        height: 64,
        background: "rgba(5,5,8,0.82)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        cursor: "crosshair",
      }}
      onMouseDown={handleNavMouseDown}
      onMouseMove={handleNavMouseMove}
      onMouseUp={handleNavMouseUp}
      onMouseLeave={handleNavMouseUp}
    >
      {/* ── Staff lines as SVG so they can wave (A) ── */}
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      >
        {STAFF_Y.map((y, i) => (
          <path
            key={i}
            d={`M 0 ${y} H 9999`}
            stroke={staffGlowing ? "rgba(74,222,128,0.32)" : "rgba(255,255,255,0.14)"}
            strokeWidth="1"
            fill="none"
            style={{ transition: "stroke 0.25s ease" }}
          />
        ))}
      </svg>

      {/* ── Travelling notes (B) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {TRAVELLERS.map((t, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              left: 0,
              top: t.y - 8,
              fontSize: 15,
              lineHeight: 1,
              color: "rgba(255,255,255,0.18)",
              animation: `sbTravel ${t.dur}s linear ${t.delay}s infinite`,
            }}
          >
            {t.char}
          </span>
        ))}
      </div>

      {/* ── Ripple notes (D) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {ripples.map(r => (
          <span
            key={r.id}
            className="absolute select-none"
            style={{
              left: r.x,
              top: r.y - 8,
              fontSize: 13,
              lineHeight: 1,
              color: "#4ade80",
              animation: `sbRipple${r.dir > 0 ? "R" : "L"} 0.55s ease-out forwards`,
            }}
          >
            {r.note}
          </span>
        ))}
      </div>

      {/* ── Content row ── */}
      <div
        className="relative h-full flex items-center justify-between px-6"
        style={{ cursor: "default" }}
      >
        {/* Wordmark */}
        <Link
          href="/about"
          className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition z-10"
        >
          <span style={{ fontSize: 30, lineHeight: 1, color: "#22c55e" }}>𝄞</span>
          <span className="text-base font-bold text-white tracking-tight">SoundBored</span>
        </Link>

        {/* Nav links */}
        {!authLoading && user && (
          <div className="flex items-center z-10">
            <MeasureBar />

            {links.map(({ href, label }) => {
              const active = pathname === href;
              const hov = hoveredHref === href;
              return (
                <div key={href} className="relative flex items-center">
                  <span
                    className="absolute left-1/2 select-none pointer-events-none"
                    style={{
                      top: -4,
                      fontSize: 13,
                      lineHeight: 1,
                      color: "#4ade80",
                      transform: "translateX(-50%)",
                      opacity: hov ? 1 : 0,
                      animation: hov ? "sbBounce 0.35s ease-out" : "none",
                      transition: "opacity 0.1s",
                    }}
                  >
                    ♪
                  </span>

                  <Link
                    href={href}
                    onMouseEnter={() => setHoveredHref(href)}
                    onMouseLeave={() => setHoveredHref(null)}
                    onClick={spawnRipple}
                    className="relative block px-3 py-1 text-sm font-semibold rounded transition-colors"
                    style={{ color: active ? "#4ade80" : hov ? "#ffffff" : "#a1a1aa", cursor: "pointer" }}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 rounded-full"
                        style={{ height: 1.5, background: "rgba(74,222,128,0.6)" }}
                      />
                    )}
                  </Link>

                  <MeasureBar />
                </div>
              );
            })}

            <button
              onMouseEnter={() => setHoveredHref("logout")}
              onMouseLeave={() => setHoveredHref(null)}
              onClick={handleLogout}
              className="ml-2 rounded-lg text-sm font-bold text-black transition-colors"
              style={{
                background: "#4ade80",
                padding: "6px 18px",
                boxShadow: "0 4px 16px rgba(74,222,128,0.35)",
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* ── Keyframe definitions ── */}
      <style>{`
        @keyframes sbTravel {
          0%   { transform: translateX(-40px); opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 1; }
          100% { transform: translateX(calc(100vw + 40px)); opacity: 0; }
        }
        @keyframes sbBounce {
          0%   { transform: translateX(-50%) translateY(8px) scale(0.5); opacity: 0; }
          55%  { transform: translateX(-50%) translateY(-5px) scale(1.2); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0)   scale(1);   opacity: 1; }
        }
        @keyframes sbRippleR {
          0%   { transform: translateX(0)     translateY(0)    scale(1);   opacity: 0.9; }
          100% { transform: translateX(110px) translateY(-18px) scale(0.4); opacity: 0; }
        }
        @keyframes sbRippleL {
          0%   { transform: translateX(0)      translateY(0)    scale(1);   opacity: 0.9; }
          100% { transform: translateX(-110px) translateY(-18px) scale(0.4); opacity: 0; }
        }
      `}</style>
    </nav>
  );
}

function MeasureBar() {
  return (
    <div
      className="shrink-0"
      style={{ width: 1, height: 36, background: "rgba(255,255,255,0.2)", margin: "0 4px" }}
    />
  );
}

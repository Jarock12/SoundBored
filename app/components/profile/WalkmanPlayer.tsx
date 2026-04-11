
// WalkmanPlayer component: renders a customizable cassette walkman UI with Spotify integration.
// The right-side button toggles the cassette reel spinning animation.
// Brand names are fictional (Suny / Strollman) to avoid trademark issues.
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type WalkmanTrack = {
  spotify_track_id: string;
  track_name: string;
  artist_name: string;
  image_url: string | null;
  preview_url?: string | null;
};

type WalkmanColors = {
  body: string;          // Main body gradient start
  bodyEnd: string;       // Main body gradient end
  rightPanel: string;    // Right side panel color
  logo: string;          // SUNY + STROLLMAN text color
  topButton: string;     // Orange top button color
  cassette: string;      // Cassette reel outer color
  arrow: string;         // Arrow indicator color
  window: string;        // Cassette window background
  sideButton: string;    // Right side play/stop button
};

const DEFAULT_COLORS: WalkmanColors = {
  body: "#497496",
  bodyEnd: "#44607B",
  rightPanel: "#BED2DD",
  logo: "#CDDBE2",
  topButton: "#E2B380",
  cassette: "#73695C",
  arrow: "#ADBCCE",
  window: "#0F1210",
  sideButton: "#7D949D",
};

type Props = {
  title: string;
  track: WalkmanTrack | null;
  colors?: Partial<WalkmanColors>;
  isOwnProfile: boolean;
  canCustomize?: boolean;
  outerBackgroundColor?: string;
  onSelectTrack?: (track: WalkmanTrack) => void;
  onUpdateColors?: (colors: WalkmanColors) => void;
  onUpdateTitle?: (title: string) => void;
};

export default function WalkmanPlayer({
  title,
  track,
  colors: colorsProp,
  isOwnProfile,
  canCustomize = false,
  outerBackgroundColor,
  onSelectTrack,
  onUpdateColors,
  onUpdateTitle,
}: Props) {
  const colors = { ...DEFAULT_COLORS, ...colorsProp };

  const [isSpinning, setIsSpinning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WalkmanTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{ loadUri: (uri: string) => void } | null>(null);
  const apiReadyRef = useRef(false);
  const trackIdRef = useRef(track?.spotify_track_id);
  trackIdRef.current = track?.spotify_track_id;

  // Load Eczar font for the SUNY logo
  useEffect(() => {
    if (!document.getElementById("eczar-font")) {
      const link = document.createElement("link");
      link.id = "eczar-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Eczar:wght@600&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const createEmbed = useCallback((trackId: string) => {
    if (!embedRef.current) return;
    const win = window as unknown as Record<string, unknown>;
    const IFrameAPI = win.SpotifyIframeApi as
      | {
          createController: (
            el: HTMLElement,
            opts: { uri: string; height: number; theme: number },
            cb: (ctrl: { loadUri: (uri: string) => void }) => void
          ) => void;
        }
      | undefined;
    if (!IFrameAPI) return;
    embedRef.current.innerHTML = "";
    controllerRef.current = null;
    IFrameAPI.createController(
      embedRef.current,
      { uri: `spotify:track:${trackId}`, height: 80, theme: 0 },
      (ctrl) => {
        controllerRef.current = ctrl;
      }
    );
  }, []);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    if (win.SpotifyIframeApi) {
      apiReadyRef.current = true;
      if (trackIdRef.current) createEmbed(trackIdRef.current);
      return;
    }
    if (document.getElementById("spotify-iframe-api")) {
      const prev = win.onSpotifyIframeApiReady as
        | ((api: unknown) => void)
        | undefined;
      win.onSpotifyIframeApiReady = (api: unknown) => {
        win.SpotifyIframeApi = api;
        apiReadyRef.current = true;
        prev?.(api);
        if (trackIdRef.current) createEmbed(trackIdRef.current);
      };
      return;
    }
    win.onSpotifyIframeApiReady = (api: unknown) => {
      win.SpotifyIframeApi = api;
      apiReadyRef.current = true;
      if (trackIdRef.current) createEmbed(trackIdRef.current);
    };
    const script = document.createElement("script");
    script.id = "spotify-iframe-api";
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);
  }, [createEmbed]);

  useEffect(() => {
    if (!apiReadyRef.current || !track) return;
    if (controllerRef.current) {
      controllerRef.current.loadUri(`spotify:track:${track.spotify_track_id}`);
    } else {
      createEmbed(track.spotify_track_id);
    }
    setIsSpinning(false);
  }, [track?.spotify_track_id, createEmbed]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track`
      );
      const data = await res.json();
      setSearchResults(data.tracks || []);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }

  function selectTrack(t: WalkmanTrack) {
    onSelectTrack?.(t);
    setSearching(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  function updateColor(key: keyof WalkmanColors, value: string) {
    onUpdateColors?.({ ...colors, [key]: value });
  }

  const showCustomizeControls = isOwnProfile && canCustomize;
  const shouldSpin = isSpinning;

  useEffect(() => {
    if (!showCustomizeControls) {
      setShowColors(false);
      setSearching(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [showCustomizeControls]);

  // Cassette reel sub-component
  function CassetteReel({ topOffset }: { topOffset: number }) {
    return (
      <div
        style={{
          position: "absolute",
          width: 30,
          height: 30,
          left: 26,
          top: topOffset,
          borderRadius: "50%",
          backgroundColor: colors.cassette,
          boxShadow:
            "0px -2.5px 1px 0px #403833 inset, 2px 3px 1px 0px #9F8C79 inset",
        }}
      >
        {/* Inner spinning assembly */}
        <div
          className={shouldSpin ? "animate-spin" : ""}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            animationDuration: "5s",
            animationTimingFunction: "linear",
          }}
        >
          {/* Dark hub */}
          <div
            style={{
              position: "absolute",
              width: 22,
              height: 22,
              left: 4,
              top: 4,
              borderRadius: "50%",
              backgroundColor: "#1F2023",
            }}
          >
            {/* Inner hub */}
            <div
              style={{
                position: "absolute",
                width: 16,
                height: 16,
                left: 3,
                top: 3,
                borderRadius: "50%",
                backgroundColor: "#2E3339",
              }}
            >
              {/* Spokes at 120° intervals */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 7,
                    height: 2,
                    left: 9,
                    top: 7,
                    backgroundColor: "#A0B6BF",
                    transformOrigin: "left",
                    transform: `rotate(${120 * i}deg)`,
                  }}
                />
              ))}
              {/* Center hub oval */}
              <div
                style={{
                  position: "absolute",
                  width: 8,
                  height: 4,
                  left: 12,
                  top: 11,
                  borderRadius: "50%",
                  backgroundColor: "#363E3E",
                  transformOrigin: "left",
                  transform: "rotate(45deg)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full rounded-2xl p-5 shadow-lg"
      style={
        outerBackgroundColor
          ? { backgroundColor: outerBackgroundColor }
          : { backgroundColor: "#18181b" }
      }
    >
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-lg font-bold text-white outline-none"
              autoFocus
            />
            <button
              onClick={() => { onUpdateTitle?.(titleDraft.trim()); setEditingTitle(false); }}
              className="rounded bg-green-500 px-2 py-1 text-xs font-semibold text-black"
            >
              Save
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {showCustomizeControls && (
              <button
                onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
                className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                ✎
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {showCustomizeControls && (
            <>
              <button
                onClick={() => {
                  setShowColors(!showColors);
                  setSearching(false);
                }}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {showColors ? "Close" : "Colors"}
              </button>
              <button
                onClick={() => {
                  setSearching(!searching);
                  setShowColors(false);
                }}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {searching ? "Close" : track ? "Change" : "Pick Song"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Color customizer */}
      {showColors && showCustomizeControls && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(
            [
              ["body", "Body Top"],
              ["bodyEnd", "Body Bottom"],
              ["rightPanel", "Side Panel"],
              ["logo", "Logo Color"],
              ["topButton", "Top Button"],
              ["cassette", "Cassette"],
              ["arrow", "Arrow"],
              ["window", "Window"],
              ["sideButton", "Side Btn"],
            ] as [keyof WalkmanColors, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs text-zinc-300"
            >
              <input
                type="color"
                value={(colors as Record<string, string>)[key]}
                onChange={(e) => updateColor(key, e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border border-zinc-600 bg-transparent"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Track search */}
      {searching && showCustomizeControls && (
        <div className="mb-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a song..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
            >
              {searchLoading ? "..." : "Search"}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {searchResults.map((t) => (
                <button
                  key={t.spotify_track_id}
                  onClick={() => selectTrack(t)}
                  className="flex w-full items-center gap-3 rounded-lg bg-zinc-800/60 p-2 text-left hover:bg-zinc-800"
                >
                  {t.image_url && (
                    <img
                      src={t.image_url}
                      alt={t.track_name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {t.track_name}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {t.artist_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Walkman body */}
      <div className="flex flex-col items-center gap-4">
        <div
          style={{
            position: "relative",
            width: 259,
            height: 418,
            borderRadius: 5,
            background: `linear-gradient(${colors.body}, ${colors.bodyEnd})`,
            boxShadow: `0 -3px 2px -0.5px ${colors.sideButton} inset, 3px 0 5px 2px ${colors.sideButton} inset, 0 4.5px 3px ${colors.sideButton}cc inset, 0 30px 20px -5px rgba(0,0,0,0.1), 0 65px 50px -10px rgba(0,0,0,0.05)`,
          }}
        >
          {/* Right side play/stop button */}
          <button
            onClick={() => setIsSpinning((s) => !s)}
            title={isSpinning ? "Stop tape" : "Play tape"}
            aria-label={isSpinning ? "Stop tape" : "Play tape"}
            style={{
              position: "absolute",
              top: 50,
              right: -10,
              width: 15,
              height: 70,
              borderRadius: 3,
              background: isSpinning
                ? `linear-gradient(90deg, #9D7449, #B08A5C)`
                : `linear-gradient(90deg, ${colors.sideButton}, #96ABB5)`,
              boxShadow:
                "-1px -1px 0px 1px #CAD5DA inset, 0 3px 1px #CAD5DA inset, 0 30px 20px -5px rgba(0,0,0,0.1)",
              cursor: "pointer",
              border: "none",
              zIndex: 1,
            }}
          />

          {/* Right side decorative panel */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 50,
              height: 418,
              borderRadius: "0 5px 5px 0",
              opacity: 0.75,
              background: `linear-gradient(${colors.rightPanel}, #A8B3BE)`,
              boxShadow:
                "-2.5px -3px 4px 2px #A4BAD8 inset, 0 3px 1px #D9DCF1 inset",
              pointerEvents: "none",
            }}
          />

          {/* Orange top button */}
          <div
            style={{
              position: "absolute",
              top: -10,
              left: 70,
              width: 32,
              height: 30,
              borderRadius: 3,
              background: `linear-gradient(${colors.topButton}, #DEA970)`,
              boxShadow:
                "-1px -1px 0px 1px #E1AA56 inset, 0 3px 1px #E1AA56 inset",
              zIndex: -1,
            }}
          />

          {/* SUNY brand logo */}
          <span
            style={{
              fontFamily: "'Eczar', Georgia, serif",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 3,
              display: "block",
              position: "absolute",
              left: 50,
              top: 65,
              background:
                "linear-gradient(-10deg, #BACDD7 20%, #FFFFF9 50%, #BACDD7 60%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: `drop-shadow(2px 2px ${colors.bodyEnd})`,
              transform: "scaleX(1.2) scaleY(0.8)",
              transformOrigin: "top left",
              userSelect: "none",
            }}
          >
            SUNY
          </span>

          {/* Horizontal shadow divider line — follows side panel color */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 60,
              width: 208,
              height: 6,
              background: `linear-gradient(${colors.rightPanel}99, rgba(14,27,51,0.85), ${colors.rightPanel} 80%)`,
              pointerEvents: "none",
            }}
          />

          {/* Cassette window */}
          <div
            style={{
              position: "absolute",
              left: 53,
              top: 120,
              width: 83,
              height: 217,
              borderRadius: 5,
              border: `1px solid ${colors.bodyEnd}`,
              backgroundColor: colors.window,
              opacity: 0.8,
            }}
          >
            {/* Window inner frame shadow */}
            <div
              style={{
                position: "absolute",
                width: 73,
                height: 207,
                left: 5,
                top: 5,
                borderRadius: 5,
                boxShadow:
                  "1px -2px 4px 2px #1D201E inset, 3px 0 6px 2px #262C2D inset, 0 3px 1px #6C7D85 inset",
                pointerEvents: "none",
              }}
            />

            {/* Dot texture overlay */}
            <div
              style={{
                position: "absolute",
                width: 73,
                height: 207,
                left: 5,
                top: 5,
                borderRadius: 5,
                opacity: 0.5,
                backgroundImage:
                  "radial-gradient(#232625 40%, transparent 60%)",
                backgroundSize: "5px 5px",
                pointerEvents: "none",
              }}
            />

            {/* Tape view port — shows track name like a cassette label */}
            <div
              style={{
                position: "absolute",
                width: 53,
                height: 87,
                left: 15,
                top: 65,
                borderRadius: 5,
                backgroundColor: "#C7D6D8",
                opacity: 0.9,
                boxShadow: "1px -2px 5px 2px #6C7D85 inset",
                overflow: "hidden",
              }}
            >
              {track && (
                /* Rotated label: 87px wide × 53px tall, positioned so it fills
                   the 53×87 window after a -90deg rotation around its center */
                <div
                  style={{
                    position: "absolute",
                    width: 87,
                    height: 53,
                    left: -17,
                    top: 17,
                    transform: "rotate(-90deg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: "0 6px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#1A2A3A",
                      letterSpacing: 0.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    {track.track_name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 6.5,
                      color: "#3A4A5A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    {track.artist_name}
                  </p>
                </div>
              )}
            </div>

            {/* Top cassette reel */}
            <CassetteReel topOffset={20} />

            {/* Bottom cassette reel */}
            <CassetteReel topOffset={165} />
          </div>

          {/* Upward arrow indicator */}
          <div
            style={{
              position: "absolute",
              right: 74,
              top: 216,
              filter: `drop-shadow(2px 2px ${colors.bodyEnd})`,
              pointerEvents: "none",
            }}
          >
            <svg width="16" height="56" viewBox="0 0 16 56" fill="none">
              {/* Arrowhead — open chevron pointing up */}
              <polyline
                points="1,34 8,4 15,34"
                stroke={colors.arrow}
                strokeWidth="3"
                strokeLinejoin="miter"
                strokeLinecap="square"
                fill="none"
              />
              {/* Shaft — left side */}
              <line x1="4.5" y1="30" x2="4.5" y2="55" stroke={colors.arrow} strokeWidth="3" strokeLinecap="square" />
              {/* Shaft — right side */}
              <line x1="11.5" y1="30" x2="11.5" y2="55" stroke={colors.arrow} strokeWidth="3" strokeLinecap="square" />
              {/* Shaft — bottom cap */}
              <line x1="4.5" y1="55" x2="11.5" y2="55" stroke={colors.arrow} strokeWidth="3" strokeLinecap="square" />
            </svg>
          </div>

          {/* Indicator dot */}
          <div
            style={{
              position: "absolute",
              top: 250,
              right: 35,
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#C7D6D8",
              boxShadow:
                "0px -1px 1px 0px #403833 inset, 1px 1px 1px 0px #9F8C79 inset",
              pointerEvents: "none",
            }}
          />

          {/* STROLLMAN brand logo */}
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 18,
              filter: `drop-shadow(2px 2px ${colors.bodyEnd})`,
              userSelect: "none",
            }}
          >
            <span
              style={{
                fontFamily: "'Eczar', Georgia, serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2.5,
                color: colors.logo,
              }}
            >
              STROLLMAN
            </span>
          </div>
        </div>

        {/* Spotify embed */}
        {track && (
          <div className="w-full overflow-hidden rounded-xl" ref={embedRef} />
        )}

        {!track && (
          <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-zinc-700 py-4 text-sm text-zinc-400">
            {isOwnProfile
              ? "Pick a song to play on your strollman"
              : "No song selected"}
          </div>
        )}
      </div>
    </div>
  );
}

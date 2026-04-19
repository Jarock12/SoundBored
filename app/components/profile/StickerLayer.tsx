"use client";

/**
 * StickerLayer
 *
 * An absolutely-positioned transparent layer that sits on top of the profile
 * grid container. Stickers live here — they are free-floating (not grid-locked)
 * and stored as % x/y coordinates so they scale with the container width.
 *
 * Behaviour summary:
 *  - View mode: pointer-events: none → clicks pass through to the grid
 *  - Edit mode: stickers are draggable, resizable via corner handles, and
 *    rotatable via a rotation handle above the sticker; a floating toolbar
 *    appears below the selected sticker for color/opacity/delete controls;
 *    a toolbar panel appears when `showToolbar` is true
 *  - All drag interactions use global window events via a ref pattern so the
 *    cursor can roam outside the container without losing the drag
 */

import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";

// ─── Public types ──────────────────────────────────────────────────────────────

export type PlacedSticker = {
  id: string;
  type: "builtin" | "custom";
  /** Key into BUILTIN_STICKER_DEFS — only set for builtin stickers */
  symbol?: string;
  /** Public URL in Supabase Storage — only set for custom stickers */
  imageUrl?: string;
  /** Percentage from the left edge of the container (0–100) */
  x: number;
  /** Percentage from the top edge of the container (0–100) */
  y: number;
  /** CSS rotation in degrees */
  rotation: number;
  /** Hex color applied to colorable unicode/SVG stickers */
  color: string;
  /** Size multiplier — base font-size is BASE_SIZE px */
  size: number;
  /** 0–1 CSS opacity */
  opacity: number;
};

export type UserCustomSticker = {
  id: string;
  image_url: string;
};

// ─── Built-in sticker catalog ──────────────────────────────────────────────────

/** Base pixel size at size multiplier = 1 */
const BASE_SIZE = 48;

type BuiltinStickerDef = {
  id: string;
  label: string;
  /** Renders the visual at the given color and size multiplier */
  render: (color: string, size: number) => React.ReactNode;
  defaultColor: string;
  /** True when the color picker visibly affects this sticker */
  colorable: boolean;
};

function unicodeSticker(char: string, color: string, size: number) {
  return (
    <span style={{ fontSize: BASE_SIZE * size, color, lineHeight: 1, display: "block" }}>
      {char}
    </span>
  );
}

/** Speech-bubble sticker helper — colored background with a downward tail */
function bubbleSticker(label: string, color: string, size: number) {
  const fs = BASE_SIZE * size * 0.32;
  const pad = `${BASE_SIZE * size * 0.1}px ${BASE_SIZE * size * 0.2}px`;
  const radius = BASE_SIZE * size * 0.12;
  const tailW = BASE_SIZE * size * 0.12;
  const tailH = BASE_SIZE * size * 0.18;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          fontSize: fs,
          color: "#000",
          backgroundColor: color,
          padding: pad,
          borderRadius: radius,
          fontWeight: 700,
          whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
      <span
        style={{
          position: "absolute",
          bottom: -tailH,
          left: BASE_SIZE * size * 0.3,
          width: 0,
          height: 0,
          borderLeft: `${tailW}px solid transparent`,
          borderRight: `${tailW}px solid transparent`,
          borderTop: `${tailH}px solid ${color}`,
          display: "block",
        }}
      />
    </div>
  );
}

export const BUILTIN_STICKER_DEFS: BuiltinStickerDef[] = [
  {
    id: "music-note",
    label: "Music Note",
    render: (c, s) => unicodeSticker("♪", c, s),
    defaultColor: "#22c55e",
    colorable: true,
  },
  {
    id: "heart",
    label: "Heart",
    render: (c, s) => unicodeSticker("♥", c, s),
    defaultColor: "#ec4899",
    colorable: true,
  },
  {
    id: "star",
    label: "Star",
    render: (c, s) => unicodeSticker("★", c, s),
    defaultColor: "#facc15",
    colorable: true,
  },
  {
    id: "broken-heart",
    label: "Broken Heart",
    render: (c, s) => unicodeSticker("💔", c, s),
    defaultColor: "#ef4444",
    colorable: false,
  },
  {
    id: "flame",
    label: "Flame",
    render: (c, s) => unicodeSticker("🔥", c, s),
    defaultColor: "#f97316",
    colorable: false,
  },
  {
    id: "sparkle",
    label: "Sparkle",
    render: (c, s) => unicodeSticker("✦", c, s),
    defaultColor: "#a855f7",
    colorable: true,
  },
  {
    id: "skull",
    label: "Skull",
    render: (c, s) => unicodeSticker("💀", c, s),
    defaultColor: "#ffffff",
    colorable: false,
  },
  {
    id: "tear",
    label: "Tear Drop",
    render: (c, s) => unicodeSticker("💧", c, s),
    defaultColor: "#60a5fa",
    colorable: false,
  },
  {
    id: "repeat",
    label: "Repeat",
    render: (c, s) => unicodeSticker("↺", c, s),
    defaultColor: "#22d3ee",
    colorable: true,
  },
  {
    id: "certified-banger",
    label: "Certified Banger",
    render: (c, s) => {
      const fs = BASE_SIZE * s * 0.35;
      const border = Math.max(1, BASE_SIZE * s * 0.04);
      const pad = `${BASE_SIZE * s * 0.08}px ${BASE_SIZE * s * 0.18}px`;
      const radius = BASE_SIZE * s * 0.12;
      return (
        <div
          style={{
            fontSize: fs,
            color: c,
            border: `${border}px solid ${c}`,
            padding: pad,
            borderRadius: radius,
            fontWeight: 900,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          ✓ Certified Banger
        </div>
      );
    },
    defaultColor: "#22c55e",
    colorable: true,
  },
  {
    id: "gatekeep",
    label: "Gatekeep",
    render: (c, s) => bubbleSticker("🤫 Gatekeep", c, s),
    defaultColor: "#a855f7",
    colorable: true,
  },
  {
    id: "on-repeat",
    label: "On Repeat",
    render: (c, s) => bubbleSticker("↺ On Repeat", c, s),
    defaultColor: "#22c55e",
    colorable: true,
  },
  {
    id: "midnight-album",
    label: "Midnight Album",
    render: (c, s) => bubbleSticker("🌙 Midnight Album", c, s),
    defaultColor: "#3b5998",
    colorable: true,
  },
];

// ─── Drag state discriminated union ────────────────────────────────────────────

type DragState =
  | {
      mode: "move";
      stickerId: string;
      startMouseX: number;
      startMouseY: number;
      startStickerX: number;
      startStickerY: number;
    }
  | {
      mode: "resize";
      stickerId: string;
      startSize: number;
      startDist: number;
      centerScreenX: number;
      centerScreenY: number;
    }
  | {
      mode: "rotate";
      stickerId: string;
      startRotation: number;
      startAngle: number;
      centerScreenX: number;
      centerScreenY: number;
    };

// ─── Component ─────────────────────────────────────────────────────────────────

type StickerLayerProps = {
  stickers: PlacedSticker[];
  customStickers: UserCustomSticker[];
  /** True when the profile owner is in edit/customize mode */
  isEditMode: boolean;
  /** Whether to show the sticker-picker toolbar panel */
  showToolbar: boolean;
  userId: string | null;
  onChange: (stickers: PlacedSticker[]) => void;
  /** Upload a custom sticker file; returns the public URL on success or null on failure */
  onUploadSticker: (file: File) => Promise<string | null>;
};

export default function StickerLayer({
  stickers,
  customStickers,
  isEditMode,
  showToolbar,
  userId,
  onChange,
  onUploadSticker,
}: StickerLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs hold the latest values so the global drag handlers never go stale
  const stickersRef = useRef(stickers);
  const onChangeRef = useRef(onChange);
  useEffect(() => { stickersRef.current = stickers; }, [stickers]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Active drag state — stored in a ref so mousemove never captures stale values
  const dragState = useRef<DragState | null>(null);

  // ── Global drag events — attached once, use refs for live data ─────────────

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const ds = dragState.current;
      if (!ds) return;

      if (ds.mode === "move") {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const dx = e.clientX - ds.startMouseX;
        const dy = e.clientY - ds.startMouseY;
        const newX = Math.max(0, Math.min(100, ds.startStickerX + (dx / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, ds.startStickerY + (dy / rect.height) * 100));
        const updated = stickersRef.current.map((s) =>
          s.id === ds.stickerId ? { ...s, x: newX, y: newY } : s
        );
        onChangeRef.current(updated);
      } else if (ds.mode === "resize") {
        const dx = e.clientX - ds.centerScreenX;
        const dy = e.clientY - ds.centerScreenY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        if (ds.startDist === 0) return;
        const scale = newDist / ds.startDist;
        const newSize = Math.max(0.2, Math.min(6, ds.startSize * scale));
        const updated = stickersRef.current.map((s) =>
          s.id === ds.stickerId ? { ...s, size: newSize } : s
        );
        onChangeRef.current(updated);
      } else if (ds.mode === "rotate") {
        const dx = e.clientX - ds.centerScreenX;
        const dy = e.clientY - ds.centerScreenY;
        const newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const delta = newAngle - ds.startAngle;
        const newRotation = ds.startRotation + delta;
        const updated = stickersRef.current.map((s) =>
          s.id === ds.stickerId ? { ...s, rotation: newRotation } : s
        );
        onChangeRef.current(updated);
      }
    }

    function handleMouseUp() {
      dragState.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // intentionally empty — live values come from refs

  // ── Sticker move interaction ───────────────────────────────────────────────

  const handleStickerMouseDown = useCallback(
    (e: React.MouseEvent, stickerId: string) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();

      const sticker = stickersRef.current.find((s) => s.id === stickerId);
      if (!sticker) return;

      setSelectedId(stickerId);

      dragState.current = {
        mode: "move",
        stickerId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startStickerX: sticker.x,
        startStickerY: sticker.y,
      };
    },
    [isEditMode]
  );

  // ── Corner resize interaction ──────────────────────────────────────────────

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, stickerId: string) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();

      const sticker = stickersRef.current.find((s) => s.id === stickerId);
      const container = containerRef.current;
      if (!sticker || !container) return;

      const rect = container.getBoundingClientRect();
      const centerScreenX = rect.left + (sticker.x / 100) * rect.width;
      const centerScreenY = rect.top + (sticker.y / 100) * rect.height;
      const dx = e.clientX - centerScreenX;
      const dy = e.clientY - centerScreenY;
      const startDist = Math.sqrt(dx * dx + dy * dy);

      dragState.current = {
        mode: "resize",
        stickerId,
        startSize: sticker.size,
        startDist,
        centerScreenX,
        centerScreenY,
      };
    },
    [isEditMode]
  );

  // ── Rotation handle interaction ────────────────────────────────────────────

  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent, stickerId: string) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();

      const sticker = stickersRef.current.find((s) => s.id === stickerId);
      const container = containerRef.current;
      if (!sticker || !container) return;

      const rect = container.getBoundingClientRect();
      const centerScreenX = rect.left + (sticker.x / 100) * rect.width;
      const centerScreenY = rect.top + (sticker.y / 100) * rect.height;
      const dx = e.clientX - centerScreenX;
      const dy = e.clientY - centerScreenY;
      const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      dragState.current = {
        mode: "rotate",
        stickerId,
        startRotation: sticker.rotation,
        startAngle,
        centerScreenX,
        centerScreenY,
      };
    },
    [isEditMode]
  );

  // ── Add stickers ───────────────────────────────────────────────────────────

  function addBuiltinSticker(defId: string) {
    const def = BUILTIN_STICKER_DEFS.find((d) => d.id === defId);
    if (!def) return;

    const newSticker: PlacedSticker = {
      id: `${defId}-${Date.now()}`,
      type: "builtin",
      symbol: defId,
      // Place near centre with a small random offset so multiple adds don't stack exactly
      x: 42 + Math.random() * 16,
      y: 42 + Math.random() * 16,
      rotation: 0,
      color: def.defaultColor,
      size: 1,
      opacity: 1,
    };

    const updated = [...stickersRef.current, newSticker];
    onChange(updated);
    setSelectedId(newSticker.id);
  }

  function addCustomSticker(imageUrl: string) {
    const newSticker: PlacedSticker = {
      id: `custom-${Date.now()}`,
      type: "custom",
      imageUrl,
      x: 42 + Math.random() * 16,
      y: 42 + Math.random() * 16,
      rotation: 0,
      color: "#ffffff",
      size: 1,
      opacity: 1,
    };

    const updated = [...stickersRef.current, newSticker];
    onChange(updated);
    setSelectedId(newSticker.id);
  }

  // ── Update / delete selected sticker ──────────────────────────────────────

  function updateSelected(patch: Partial<PlacedSticker>) {
    const updated = stickersRef.current.map((s) =>
      s.id === selectedId ? { ...s, ...patch } : s
    );
    onChange(updated);
  }

  function deleteSelected() {
    onChange(stickersRef.current.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }

  // ── Custom sticker upload ──────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-uploaded if desired
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const url = await onUploadSticker(file);
    setUploading(false);

    if (url) addCustomSticker(url);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderStickerContent(sticker: PlacedSticker) {
    if (sticker.type === "custom" && sticker.imageUrl) {
      return (
        <Image
          src={sticker.imageUrl}
          alt="sticker"
          draggable={false}
          unoptimized
          width={Math.round(BASE_SIZE * sticker.size)}
          height={Math.round(BASE_SIZE * sticker.size)}
          style={{ objectFit: "contain", display: "block" }}
        />
      );
    }

    const def = BUILTIN_STICKER_DEFS.find((d) => d.id === sticker.symbol);
    return def ? def.render(sticker.color, sticker.size) : null;
  }

  const selectedSticker = stickers.find((s) => s.id === selectedId) ?? null;
  const selectedDef =
    selectedSticker?.type === "builtin"
      ? BUILTIN_STICKER_DEFS.find((d) => d.id === selectedSticker.symbol) ?? null
      : null;

  const showColorPicker = selectedSticker?.type === "custom" || selectedDef?.colorable === true;

  // Corner handle positions: [top, left, bottom, right, cursor]
  const CORNER_HANDLES = [
    { top: -10, left: -10, cursor: "nw-resize" },
    { top: -10, right: -10, cursor: "ne-resize" },
    { bottom: -10, left: -10, cursor: "sw-resize" },
    { bottom: -10, right: -10, cursor: "se-resize" },
  ] as const;

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      // Container is always pointer-events:none so clicks pass through to grid sections.
      // Only individual stickers, handles, and the toolbar re-enable pointer events.
      style={{ pointerEvents: "none" }}
    >
      {/* ── Placed stickers ── */}
      {stickers.map((sticker) => {
        const isSelected = isEditMode && sticker.id === selectedId;

        return (
          <div
            key={sticker.id}
            // Outer wrapper: position only — no rotation so the toolbar stays readable
            style={{
              position: "absolute",
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: isEditMode ? "auto" : "none",
              userSelect: "none",
            }}
            onClick={(e) => {
              if (!isEditMode) return;
              e.stopPropagation();
              setSelectedId(sticker.id);
            }}
          >
            {/* Rotation wrapper — rotates content + handles + knob together, like Google Slides */}
            <div style={{ transform: `rotate(${sticker.rotation}deg)`, display: "inline-block" }}>
              {/* Rotation handle — sits above the sticker in rotated space */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -36,
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pointerEvents: "auto",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    onMouseDown={(e) => handleRotateMouseDown(e, sticker.id)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.85)",
                      backgroundColor: "rgba(0,0,0,0.55)",
                      cursor: "crosshair",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}
                  />
                  <div style={{ width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.45)" }} />
                </div>
              )}

              {/* Sticker content — drag-to-move target, outline follows rotation */}
              <div
                onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                style={{
                  opacity: sticker.opacity,
                  cursor: isEditMode
                    ? dragState.current?.stickerId === sticker.id && dragState.current.mode === "move"
                      ? "grabbing"
                      : "grab"
                    : "default",
                  outline: isSelected ? "2px dashed rgba(255,255,255,0.55)" : "none",
                  outlineOffset: 6,
                  borderRadius: 4,
                }}
              >
                {renderStickerContent(sticker)}
              </div>

              {/* Corner resize handles — inside rotation wrapper so they follow the sticker */}
              {isSelected &&
                CORNER_HANDLES.map((pos, i) => (
                  <div
                    key={i}
                    onMouseDown={(e) => handleResizeMouseDown(e, sticker.id)}
                    style={{
                      position: "absolute",
                      width: 20,
                      height: 20,
                      ...pos,
                      cursor: pos.cursor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: "white",
                        border: "1px solid rgba(0,0,0,0.35)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    />
                  </div>
                ))}
            </div>{/* end rotation wrapper */}

            {/* Floating toolbar — appears below the selected sticker */}
            {isSelected && selectedSticker && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  backgroundColor: "rgba(9,9,11,0.96)",
                  border: "1px solid rgba(113,113,122,0.5)",
                  borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  whiteSpace: "nowrap",
                  zIndex: 30,
                  pointerEvents: "auto",
                }}
              >
                {/* Color picker — only for colorable stickers */}
                {showColorPicker && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#a1a1aa" }}>Color</span>
                    <input
                      type="color"
                      value={selectedSticker.color}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                      style={{
                        width: 24,
                        height: 24,
                        cursor: "pointer",
                        borderRadius: 4,
                        border: "1px solid #52525b",
                        backgroundColor: "transparent",
                        padding: 0,
                      }}
                      title="Sticker color"
                    />
                  </div>
                )}

                {/* Opacity slider */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "#a1a1aa" }}>Opacity</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={Math.round(selectedSticker.opacity * 100)}
                    onChange={(e) => updateSelected({ opacity: Number(e.target.value) / 100 })}
                    style={{ width: 64 }}
                    title="Opacity"
                  />
                  <span style={{ fontSize: 10, color: "#71717a", width: 28, textAlign: "right" }}>
                    {Math.round(selectedSticker.opacity * 100)}%
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={deleteSelected}
                  style={{
                    padding: "2px 8px",
                    fontSize: 12,
                    color: "#fca5a5",
                    border: "1px solid #7f1d1d",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                  title="Delete sticker"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Sticker picker toolbar (left side) ── */}
      {isEditMode && showToolbar && (
        <div
          className="absolute left-2 top-2 z-30 w-72 rounded-xl border border-purple-700/60 bg-zinc-950/95 p-3 shadow-xl backdrop-blur"
          style={{ pointerEvents: "auto", maxHeight: "60vh", overflowY: "auto" }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-[11px] font-semibold text-zinc-300">Add Stickers</p>

          {/* Built-in sticker catalog */}
          <div className="mb-3 flex flex-wrap gap-2">
            {BUILTIN_STICKER_DEFS.map((def) => (
              <button
                key={def.id}
                title={def.label}
                onClick={() => addBuiltinSticker(def.id)}
                className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 hover:border-purple-500 hover:bg-zinc-800 transition"
              >
                {/* Render at half-scale for the catalog preview */}
                <span style={{ fontSize: 22, lineHeight: 1, pointerEvents: "none" }}>
                  {def.render(def.defaultColor, 0.46)}
                </span>
              </button>
            ))}
          </div>

          {/* Custom sticker uploads (only for the profile owner) */}
          {userId && (
            <>
              <p className="mb-1 text-[10px] font-semibold text-zinc-400">Your custom stickers</p>
              <div className="flex flex-wrap gap-2">
                {customStickers.map((cs) => (
                  <button
                    key={cs.id}
                    title="Place this sticker"
                    onClick={() => addCustomSticker(cs.image_url)}
                    className="h-11 w-11 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 hover:border-purple-500 hover:ring-1 hover:ring-purple-500 transition"
                  >
                    <img
                      src={cs.image_url}
                      alt="custom sticker"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </button>
                ))}

                {/* Upload button */}
                <label
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-900 text-zinc-400 hover:border-purple-500 hover:text-purple-400 transition"
                  title="Upload PNG or WebP (max 2 MB)"
                >
                  {uploading ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <span className="text-xl leading-none">+</span>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>
              </div>
              <p className="mt-1.5 text-[9px] text-zinc-600">PNG or WebP · max 2 MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

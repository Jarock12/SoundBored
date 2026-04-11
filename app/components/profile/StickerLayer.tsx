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
 *  - Edit mode: stickers are draggable; a controls bar appears when one is selected;
 *    a toolbar panel appears when `showToolbar` is true
 *  - Drag uses global window events attached once on mount (via a ref pattern)
 *    so the cursor can roam outside the container without losing the drag
 */

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
  const dragState = useRef<{
    stickerId: string;
    startMouseX: number;
    startMouseY: number;
    startStickerX: number;
    startStickerY: number;
  } | null>(null);

  // ── Global drag events — attached once, use refs for live data ─────────────

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const ds = dragState.current;
      if (!ds) return;

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

  // ── Sticker interaction ────────────────────────────────────────────────────

  const handleStickerMouseDown = useCallback(
    (e: React.MouseEvent, stickerId: string) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();

      const sticker = stickersRef.current.find((s) => s.id === stickerId);
      if (!sticker) return;

      setSelectedId(stickerId);

      dragState.current = {
        stickerId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startStickerX: sticker.x,
        startStickerY: sticker.y,
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
        <img
          src={sticker.imageUrl}
          alt="sticker"
          draggable={false}
          style={{
            width: BASE_SIZE * sticker.size,
            height: BASE_SIZE * sticker.size,
            objectFit: "contain",
            display: "block",
          }}
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

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      // Container is always pointer-events:none so clicks pass through to grid sections.
      // Only individual stickers, the controls bar, and the toolbar re-enable pointer events.
      style={{ pointerEvents: "none" }}
    >
      {/* ── Placed stickers ── */}
      {stickers.map((sticker) => {
        const isSelected = isEditMode && sticker.id === selectedId;
        return (
          <div
            key={sticker.id}
            onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
            onClick={(e) => {
              if (!isEditMode) return;
              e.stopPropagation();
              setSelectedId(sticker.id);
            }}
            style={{
              position: "absolute",
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
              opacity: sticker.opacity,
              pointerEvents: isEditMode ? "auto" : "none",
              cursor: isEditMode ? (dragState.current?.stickerId === sticker.id ? "grabbing" : "grab") : "default",
              userSelect: "none",
              outline: isSelected ? "2px dashed rgba(255,255,255,0.6)" : "none",
              outlineOffset: 6,
              borderRadius: 4,
            }}
          >
            {renderStickerContent(sticker)}
          </div>
        );
      })}

      {/* ── Selected sticker controls bar (top-right) ── */}
      {isEditMode && selectedSticker && (
        <div
          className="absolute right-2 top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-3 py-2 shadow-xl backdrop-blur"
          style={{ pointerEvents: "auto", maxWidth: "calc(100% - 16px)" }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-semibold text-zinc-400">Sticker</span>

          {/* Color */}
          {showColorPicker && (
            <div className="flex items-center gap-1">
              <label className="text-[10px] text-zinc-400">Color</label>
              <input
                type="color"
                value={selectedSticker.color}
                onChange={(e) => updateSelected({ color: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border border-zinc-600 bg-transparent"
                title="Sticker color"
              />
            </div>
          )}

          {/* Size */}
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-zinc-400">Size</label>
            <input
              type="range"
              min={20}
              max={400}
              step={5}
              value={Math.round(selectedSticker.size * 100)}
              onChange={(e) => updateSelected({ size: Number(e.target.value) / 100 })}
              className="w-20"
              title="Size"
            />
            <span className="w-8 text-right text-[10px] text-zinc-400">{Math.round(selectedSticker.size * 100)}%</span>
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-zinc-400">Rotate</label>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selectedSticker.rotation}
              onChange={(e) => updateSelected({ rotation: Number(e.target.value) })}
              className="w-20"
              title="Rotation"
            />
            <span className="w-8 text-right text-[10px] text-zinc-400">{selectedSticker.rotation}°</span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-zinc-400">Opacity</label>
            <input
              type="range"
              min={10}
              max={100}
              step={1}
              value={Math.round(selectedSticker.opacity * 100)}
              onChange={(e) => updateSelected({ opacity: Number(e.target.value) / 100 })}
              className="w-16"
              title="Opacity"
            />
            <span className="w-7 text-right text-[10px] text-zinc-400">{Math.round(selectedSticker.opacity * 100)}%</span>
          </div>

          {/* Delete */}
          <button
            onClick={deleteSelected}
            className="rounded border border-red-700 px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/40"
            title="Delete sticker"
          >
            ✕ Delete
          </button>
        </div>
      )}

      {/* ── Sticker picker toolbar (top-left) ── */}
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

import { AgentDefinition } from "@/types";

// The seven-agent MVP roster. Colors are functional, not decorative — each is
// the badge/accent used everywhere that agent's department appears, so a user
// can identify a department at a glance the same way they'd learn a building
// directory. Chosen to read clearly on a dark graphite surface without
// touching orange (reserved) or neon green/red (reserved for status states).

export const AGENT_ROSTER: AgentDefinition[] = [
  {
    id: "orion",
    name: "Orion",
    role: "Manager Agent",
    department: "management",
    color: "#8B7FD6",
    deskLabel: "Corner office, three monitors, the whiteboard everyone else only hears about",
    capabilities: [
      { key: "plan", label: "Task planning" },
      { key: "delegate", label: "Delegation" },
      { key: "review", label: "Result review" },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    role: "Story & Content Agent",
    department: "story",
    color: "#D98BA0",
    deskLabel: "Writing desk against the window, shelf of reference books",
    capabilities: [
      { key: "story", label: "Story writing" },
      { key: "script", label: "Scripting" },
      { key: "characters", label: "Character design" },
    ],
  },
  {
    id: "pixel",
    name: "Pixel",
    role: "Image & Design Agent",
    department: "image",
    color: "#E0A857",
    deskLabel: "Dual-monitor art station, drawing tablet, color swatches pinned up",
    capabilities: [
      { key: "prompts", label: "Prompt design" },
      { key: "image_gen", label: "Image generation" },
      { key: "consistency", label: "Character consistency" },
    ],
  },
  {
    id: "motion",
    name: "Motion",
    role: "Video Generation Agent",
    department: "video",
    color: "#5FA8D3",
    deskLabel: "Production booth, large reference monitor, storyboard rail",
    capabilities: [
      { key: "anim_prompts", label: "Animation prompts" },
      { key: "video_gen", label: "Video generation" },
      { key: "continuity", label: "Continuity checks" },
    ],
  },
  {
    id: "echo",
    name: "Echo",
    role: "Voice & Audio Agent",
    department: "audio",
    color: "#4FBDBA",
    deskLabel: "Treated recording booth, mixing desk, wall of headphones",
    capabilities: [
      { key: "narration", label: "Narration" },
      { key: "voices", label: "Character voices" },
      { key: "sfx", label: "Sound & music" },
    ],
  },
  {
    id: "frame",
    name: "Frame",
    role: "Video Editor Agent",
    department: "editing",
    color: "#7FAE8C",
    deskLabel: "Editing suite, colour-graded reference wall, timeline monitor",
    capabilities: [
      { key: "assembly", label: "Clip assembly" },
      { key: "subtitles", label: "Subtitling" },
      { key: "export", label: "Final export" },
    ],
  },
  {
    id: "nova",
    name: "Nova",
    role: "Publishing Agent",
    department: "publishing",
    color: "#C97FBE",
    deskLabel: "Command desk facing the analytics wall",
    capabilities: [
      { key: "metadata", label: "Titles & metadata" },
      { key: "thumbnails", label: "Thumbnail concepts" },
      { key: "publish", label: "Publish prep" },
    ],
  },
];

export const getAgent = (id: string): AgentDefinition | undefined =>
  AGENT_ROSTER.find((a) => a.id === id);

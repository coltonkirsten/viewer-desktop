# Canvas: Agent-Controlled UI

**The idea**: White screen, text input at bottom. User types natural language, agent manipulates the canvas to accomplish the task. No menus, no buttons (except the ones the agent creates).

## Core Architecture

```
┌─────────────────────────────────────────────────┐
│                   Canvas                         │
│  ┌─────────────┐  ┌─────────────┐               │
│  │   Element   │  │   Element   │               │
│  │  (camera)   │  │  (photos)   │               │
│  └─────────────┘  └─────────────┘               │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ [____________________________________]  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
         │
         │ User input
         ▼
┌─────────────────┐     HTTP/JSON      ┌─────────────────┐
│  Canvas Server  │◄──────────────────►│     Agent       │
│  (like viewer   │                    │  (Claude, etc)  │
│   control srv)  │                    │                 │
└─────────────────┘                    └─────────────────┘
```

## The Pattern (from viewer-ctl)

viewer-ctl proved: **State + HTTP API + CLI = agent control**

Canvas version:
- **State**: Array of elements on screen (position, size, type, props)
- **HTTP API**: CRUD for elements, plus layout helpers
- **Agent**: Receives user intent, calls API to manipulate canvas

## State Model (keep it stupid simple)

```typescript
interface CanvasState {
  elements: Element[];
}

interface Element {
  id: string;
  type: string;           // 'camera' | 'photo-grid' | 'button' | 'web' | 'custom'
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;  // type-specific config
  zIndex: number;
}
```

That's it. No windows, no tabs, no workspaces. Just elements on a canvas.

## API (viewer-ctl style)

```
GET  /state              → current canvas state
POST /element            → create element { type, props, position?, size? }
PUT  /element/:id        → update element props/position/size
DELETE /element/:id      → remove element
POST /layout             → auto-arrange elements { preset: 'stack' | 'grid' | 'focus' }
POST /clear              → remove all elements
```

**Example flow:**

User: "show me the camera"
```
POST /element
{ "type": "camera", "props": {} }
```
→ Agent gets back `{ "id": "el_abc", "type": "camera", ... }`
→ Canvas renders camera element, auto-positioned

User: "add a photo capture button"
```
POST /element
{ "type": "button", "props": { "label": "Capture", "action": "capture-photo" } }

POST /layout
{ "preset": "stack" }  // camera on top, button below
```

User: "show me my photos"
```
GET /state  // agent checks what's on screen
DELETE /element/el_abc  // remove camera (not enough room)
POST /element
{ "type": "photo-grid", "props": { "source": "library" } }
```

## Pre-defined Elements (MVP)

Start with ~5-10 hardcoded element types:

| Type | Props | Description |
|------|-------|-------------|
| `camera` | `facing: 'front'\|'back'` | Live camera feed |
| `photo-grid` | `source: 'library'\|'recent'`, `limit` | Photo thumbnails |
| `button` | `label`, `action`, `style` | Tappable button |
| `web` | `url` | Embedded webview |
| `text` | `content`, `size` | Text display |
| `image` | `src` | Single image |
| `input` | `placeholder`, `onSubmit` | Text input field |

Actions (for buttons) are predefined too:
- `capture-photo` - takes photo from active camera
- `navigate:url` - opens URL in web element
- `clear-canvas` - removes all elements
- `submit:input_id` - submits input value

## Custom Elements (Phase 2)

The magic unlock: agent can generate custom elements on the fly.

```
POST /element
{
  "type": "custom",
  "props": {
    "html": "<div>...</div>",
    "css": "...",
    "js": "..."  // sandboxed
  }
}
```

This is where it gets OpenClaw-like. Agent can create arbitrary UI when predefined elements don't fit. But MVP doesn't need this - predefined elements cover 80% of use cases.

## Layout System

Keep it dumb:
- Elements have position (x, y) and size (width, height)
- `POST /layout { preset }` auto-arranges:
  - `stack` - vertical stack, centered
  - `grid` - responsive grid
  - `focus` - one element big, others small below
- Agent can also set explicit positions if needed

Auto-sizing: elements have sensible defaults. Camera fills available space. Buttons are button-sized. Agent can override.

## Agent Interface

The agent needs:
1. Current canvas state (GET /state)
2. Available element types (GET /elements/types)
3. User's message
4. System prompt explaining the paradigm

System prompt (sketch):
```
You control a canvas UI. The user describes what they want to see or do.
You manipulate elements on the canvas to accomplish their intent.

Available elements: camera, photo-grid, button, web, text, image, input

Commands:
- Create element: POST /element { type, props }
- Update element: PUT /element/:id { props }
- Remove element: DELETE /element/:id
- Auto-layout: POST /layout { preset: 'stack' | 'grid' | 'focus' }

Current canvas state will be provided with each request.

Think step by step:
1. What does the user want to accomplish?
2. What elements are needed?
3. What's already on screen that can be reused or needs to be removed?
4. Execute the minimal API calls to achieve the goal.
```

## Implementation Layers

**Layer 1: Canvas Renderer (React/Swift)**
- Renders elements based on state
- Handles element-specific logic (camera access, photo library, etc.)
- Provides the text input at bottom

**Layer 2: Canvas Server (like ControlServer)**
- HTTP API for state manipulation
- Holds canonical state
- Broadcasts changes (WebSocket optional, polling fine for MVP)

**Layer 3: Agent Loop**
- Receives user input
- Gets current state
- Decides actions
- Calls API
- (Optional) Responds to user

## MVP Scope

Week 1 deliverable:
- [ ] Canvas renderer with 5 element types (camera, photo-grid, button, web, text)
- [ ] Canvas server with CRUD API
- [ ] Basic layout presets (stack, grid)
- [ ] Agent integration (Claude API or local)
- [ ] Single text input at bottom

Skip for MVP:
- Custom elements (HTML generation)
- Complex layouts
- Persistence
- Multi-canvas
- Undo/redo

## Why This Works

1. **Simple state model** - just an array of elements
2. **Proven pattern** - viewer-ctl already showed HTTP + state works
3. **Agent-native** - JSON in, JSON out, natural language intent
4. **Extensible** - add element types without changing architecture
5. **Steve Jobs approved** - white screen, one input, elements appear

## Open Questions

1. **Platform**: Web (fastest), iOS native (camera/photos easier), Electron (desktop)
2. **Agent hosting**: API call per interaction, or persistent connection?
3. **Actions**: How do buttons trigger behavior? Callback to agent? Predefined actions?
4. **Persistence**: Save/load canvas states? Or ephemeral only?

## Next Steps

1. Pick platform (recommend web for speed, can port later)
2. Build canvas renderer with 3 element types
3. Add canvas server (copy ControlServer pattern)
4. Wire up agent loop
5. Test with real interactions

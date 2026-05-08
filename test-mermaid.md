# Mermaid Diagram Test

This markdown file contains embedded mermaid diagrams to test the new rendering feature.

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug it]
    D --> B
    C --> E[End]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Viewer
    participant Mermaid

    User->>Viewer: Open markdown file
    Viewer->>Mermaid: Parse code block
    Mermaid-->>Viewer: Return SVG
    Viewer-->>User: Display diagram
```

## Class Diagram

```mermaid
classDiagram
    class MermaidDiagram {
        +string code
        +string id
        +render()
        +zoom()
        +pan()
    }
    class MarkdownEditor {
        +string content
        +renderMarkdown()
    }
    MarkdownEditor --> MermaidDiagram : uses
```

## Regular Code Block (should still work)

```typescript
function hello() {
    console.log("This is NOT a mermaid diagram");
}
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Preview
    Preview --> Expanded : click
    Expanded --> Preview : close
    Expanded --> Zoomed : scroll
    Zoomed --> Expanded : reset
    Preview --> [*]
```

Done! Click any diagram to expand it with zoom/pan controls.

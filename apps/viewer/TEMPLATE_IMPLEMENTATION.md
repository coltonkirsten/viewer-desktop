# Kanban Card Template Implementation Guide

This document describes the exact code changes needed to add card template functionality to the Kanban board.

## Changes Required

### 1. Update CardEditModalProps Interface

Add `onSaveAsTemplate` prop:

```typescript
interface CardEditModalProps {
  card: KanbanCard;
  onSave: (updates: Partial<KanbanCard>) => void;
  onDelete: () => void;
  onArchive: () => void;
  onClose: () => void;
  onSaveAsTemplate?: () => void; // ADD THIS LINE
}
```

### 2. Update CardEditModal Function Signature

Add `onSaveAsTemplate` to destructured props:

```typescript
function CardEditModal({ card, onSave, onDelete, onArchive, onClose, onSaveAsTemplate }: CardEditModalProps) {
```

### 3. Add "Save as Template" Button in CardEditModal

Add this button inside the `<div className="flex items-center gap-2">` div (before Archive button):

```tsx
{onSaveAsTemplate && (
  <button
    onClick={onSaveAsTemplate}
    className="px-3 py-1.5 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/10 rounded flex items-center gap-1.5 transition-colors"
  >
    <Copy size={14} />
    Save as Template
  </button>
)}
```

### 4. Add Template State in KanbanBoard Component

Add this state after the archive panel state:

```typescript
// Template menu state
const [showTemplateMenu, setShowTemplateMenu] = useState<string | null>(null); // columnId when open
```

### 5. Add Template Handlers in KanbanBoard Component

Add these handlers after the `handleTagClick` handler:

```typescript
// Template handlers
const handleSaveAsTemplate = useCallback((card: KanbanCard) => {
  if (!board) return;

  const template: CardTemplate = {
    id: `template-${crypto.randomUUID()}`,
    name: `Template: ${card.title.substring(0, 20)}`,
    title: card.title,
    description: card.description,
    tags: card.tags,
    priority: card.priority,
  };

  const next: KanbanBoardData = {
    ...board,
    cardTemplates: [...(board.cardTemplates || []), template],
  };

  markDirty(next);
  setEditingCard(null); // Close the modal after saving
}, [board, markDirty]);

const handleCreateFromTemplate = useCallback((columnId: string, template: CardTemplate) => {
  if (!board) return;

  const newCard: KanbanCard = {
    id: `card-${crypto.randomUUID()}`,
    title: template.title,
    description: template.description,
    tags: template.tags ? [...template.tags] : [],
    priority: template.priority,
    createdAt: new Date().toISOString(),
  };

  const next: KanbanBoardData = {
    ...board,
    columns: board.columns.map(col =>
      col.id === columnId
        ? { ...col, cards: [newCard, ...col.cards] }
        : col
    ),
  };

  markDirty(next);
  setShowTemplateMenu(null);
}, [board, markDirty]);

const handleDeleteTemplate = useCallback((templateId: string) => {
  if (!board) return;

  const next: KanbanBoardData = {
    ...board,
    cardTemplates: board.cardTemplates?.filter(t => t.id !== templateId) || [],
  };

  markDirty(next);
}, [board, markDirty]);

const handleArchiveCard = useCallback((columnId: string, cardId: string) => {
  if (!board) return;

  const sourceColumn = board.columns.find(c => c.id === columnId);
  const cardToArchive = sourceColumn?.cards.find(c => c.id === cardId);

  if (!cardToArchive) return;

  const archivedCard: KanbanCard = {
    ...cardToArchive,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedFromColumn: columnId,
  };

  const next: KanbanBoardData = {
    ...board,
    columns: board.columns.map(col =>
      col.id === columnId
        ? { ...col, cards: col.cards.filter(c => c.id !== cardId) }
        : col
    ),
    archivedCards: [...(board.archivedCards || []), archivedCard],
  };

  markDirty(next);
  setEditingCard(null);
}, [board, markDirty]);
```

### 6. Add useEffect for Click-Outside Handler

Add this after the other useEffects:

```typescript
// Close template menu when clicking outside
useEffect(() => {
  const handleClickOutside = () => setShowTemplateMenu(null);
  if (showTemplateMenu) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
}, [showTemplateMenu]);
```

### 7. Update ColumnProps Interface

Add template-related props:

```typescript
interface ColumnProps {
  column: KanbanColumn;
  columnIndex: number;
  onAddCard: (columnId: string, title: string, description: string, tags: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditCard: (card: KanbanCard, columnId: string) => void;
  onUpdateColumnTitle: (columnId: string, newTitle: string) => void;
  onTagClick?: (tag: string) => void;
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string, columnId: string, columnIndex: number, cardIndex: number) => void;
  // ADD THESE:
  templates?: CardTemplate[];
  onCreateFromTemplate?: (columnId: string, template: CardTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  showTemplateMenu?: string | null;
  onSetShowTemplateMenu?: (columnId: string | null) => void;
}
```

### 8. Update Column Function Signature

Add template props to destructuring:

```typescript
function Column({
  column,
  columnIndex,
  onAddCard,
  onDeleteColumn,
  onEditCard,
  onUpdateColumnTitle,
  onTagClick,
  selectedCardId,
  onSelectCard,
  templates,
  onCreateFromTemplate,
  onDeleteTemplate,
  showTemplateMenu,
  onSetShowTemplateMenu,
}: ColumnProps) {
```

### 9. Replace "Add Card" Button in Column Component

Replace the existing Plus button with this template-aware version:

```tsx
<div className="relative">
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (templates?.length) {
        onSetShowTemplateMenu?.(onSetShowTemplateMenu && showTemplateMenu === column.id ? null : column.id);
      } else {
        setShowAddForm(true);
      }
    }}
    className="p-1.5 rounded text-[var(--holo-muted)] hover:text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/10 transition-colors"
    title="Add card"
  >
    <Plus size={14} />
  </button>

  {/* Template dropdown */}
  {showTemplateMenu === column.id && (
    <div
      className="absolute top-full right-0 mt-1 w-56 bg-[rgba(15,15,25,0.98)] border border-[var(--holo-border)] rounded-lg shadow-xl z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-[var(--holo-border)]">
        <button
          onClick={() => {
            onSetShowTemplateMenu?.(null);
            setShowAddForm(true);
          }}
          className="w-full px-3 py-2 text-sm text-left rounded hover:bg-[var(--holo-accent)]/10 flex items-center gap-2"
        >
          <Plus size={14} />
          Blank Card
        </button>
      </div>
      <div className="p-2">
        <div className="text-xs text-[var(--holo-muted)] px-3 py-1">Templates</div>
        {templates?.map(template => (
          <div
            key={template.id}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[var(--holo-accent)]/10 group"
          >
            <button
              onClick={() => onCreateFromTemplate?.(column.id, template)}
              className="flex-1 text-sm text-left truncate"
            >
              {template.name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTemplate?.(template.id);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 text-[var(--holo-muted)] hover:text-rose-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

### 10. Update DraggableColumnProps Interface

Add the same template props as ColumnProps.

### 11. Update DraggableColumn Component

Pass the template props through to Column component.

### 12. Update CardEditModal Rendering

Add `onSaveAsTemplate` and `onArchive` props when rendering:

```tsx
{editingCard && (
  <CardEditModal
    card={editingCard.card}
    onSave={(updates) =>
      handleUpdateCard(editingCard.card.id, editingCard.columnId, updates)
    }
    onDelete={() => handleDeleteCard(editingCard.columnId, editingCard.card.id)}
    onArchive={() => handleArchiveCard(editingCard.columnId, editingCard.card.id)}
    onSaveAsTemplate={() => handleSaveAsTemplate(editingCard.card)}
    onClose={() => setEditingCard(null)}
  />
)}
```

### 13. Update DraggableColumn Rendering

Pass template props when rendering DraggableColumn:

```tsx
<DraggableColumn
  column={column}
  columnIndex={columnIndex}
  onAddCard={handleAddCard}
  onDeleteColumn={handleDeleteColumn}
  onEditCard={(card, colId) => setEditingCard({ card, columnId: colId })}
  onUpdateColumnTitle={handleUpdateColumnTitle}
  selectedCardId={selectedCard?.cardId}
  onSelectCard={(cardId, columnId, colIdx, cardIdx) => {
    setSelectedCard({
      cardId,
      columnId,
      columnIndex: colIdx,
      cardIndex: cardIdx,
    });
  }}
  onTagClick={handleTagClick}
  templates={board?.cardTemplates}
  onCreateFromTemplate={handleCreateFromTemplate}
  onDeleteTemplate={handleDeleteTemplate}
  showTemplateMenu={showTemplateMenu}
  onSetShowTemplateMenu={setShowTemplateMenu}
/>
```

## Summary

These changes add:
1. A "Save as Template" button in the card edit modal
2. A template picker dropdown when clicking the "+" button (if templates exist)
3. The ability to create cards from templates
4. The ability to delete templates
5. Templates are stored in `board.cardTemplates`

The implementation follows the existing patterns in the codebase and integrates seamlessly with the current UI.

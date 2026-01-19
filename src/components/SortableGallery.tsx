"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"

interface GalleryImage {
  id: string
  url: string
}

interface SortableImageProps {
  image: GalleryImage
  onRemove?: (id: string) => void
  disabled?: boolean
}

function SortableImage({ image, onRemove, disabled }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-lg overflow-hidden bg-[#193DAB]/12
        ${isDragging ? "shadow-lg ring-2 ring-[#F86600]" : ""}
        ${disabled ? "" : "cursor-grab active:cursor-grabbing"}
      `}
    >
      <img
        src={image.url}
        alt="Gallery afbeelding"
        className="h-20 w-full object-contain"
      />

      {/* Drag handle overlay */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-6 w-6 text-white drop-shadow-md" />
          </div>
        </div>
      )}

      {/* Remove button */}
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(image.id)
          }}
          className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

interface SortableGalleryProps {
  images: GalleryImage[]
  onReorder: (images: GalleryImage[]) => void
  onRemove?: (id: string) => void
  disabled?: boolean
}

export function SortableGallery({
  images,
  onReorder,
  onRemove,
  disabled = false,
}: SortableGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms hold before drag starts on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)
      
      const newOrder = arrayMove(images, oldIndex, newIndex)
      onReorder(newOrder)
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map((img) => img.id)}
        strategy={rectSortingStrategy}
      >
        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <SortableImage
              key={image.id}
              image={image}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

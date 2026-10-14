"use client"

import * as React from "react"
import { cn } from "cn"
import { Select as SelectPrimitive } from "radix-ui"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

/* ---------------------------------------------------------------------------
 * Hover-to-open (app customisation of the shadcn Select).
 * - Mouse only: touch and pen keep tap-to-open; keyboard and click are unchanged.
 * - Opens after a short hover-intent delay; a select opened by hover closes again once
 *   the pointer has left both the trigger and the list for a moment.
 * - Radix disables outside pointer events while open, so leaving is tracked with a
 *   document-level pointermove + bounding boxes instead of pointerleave.
 * ------------------------------------------------------------------------- */
const HOVER_OPEN_DELAY = 120
const HOVER_CLOSE_DELAY = 250
const HOVER_SLOP = 8

interface HoverContextValue {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  onTriggerEnter: (event: React.PointerEvent) => void
  onTriggerLeave: (event: React.PointerEvent) => void
}

const SelectHoverContext = React.createContext<HoverContextValue | null>(null)

function within(rect: DOMRect | undefined, x: number, y: number) {
  return (
    !!rect &&
    x >= rect.left - HOVER_SLOP &&
    x <= rect.right + HOVER_SLOP &&
    y >= rect.top - HOVER_SLOP &&
    y <= rect.bottom + HOVER_SLOP
  )
}

function Select({
  open: openProp,
  defaultOpen,
  onOpenChange,
  openOnHover = true,
  disabled,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root> & {
  /** Open the list when a mouse hovers the trigger. Default true. */
  openOnHover?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const open = openProp ?? uncontrolledOpen
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const openTimer = React.useRef<number | undefined>(undefined)
  const closeTimer = React.useRef<number | undefined>(undefined)
  const [openedByHover, setOpenedByHover] = React.useState(false)

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!next) setOpenedByHover(false)
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )

  const onTriggerEnter = (event: React.PointerEvent) => {
    if (!openOnHover || disabled || event.pointerType !== "mouse" || open) return
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => {
      setOpenedByHover(true)
      setOpen(true)
    }, HOVER_OPEN_DELAY)
  }

  const onTriggerLeave = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") window.clearTimeout(openTimer.current)
  }

  // While open via hover, close once the pointer is outside trigger + list for a moment.
  React.useEffect(() => {
    if (!open || !openedByHover) return
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const inside =
        within(triggerRef.current?.getBoundingClientRect(), event.clientX, event.clientY) ||
        within(contentRef.current?.getBoundingClientRect(), event.clientX, event.clientY)
      if (inside) {
        window.clearTimeout(closeTimer.current)
        closeTimer.current = undefined
      } else if (closeTimer.current === undefined) {
        closeTimer.current = window.setTimeout(() => {
          closeTimer.current = undefined
          setOpen(false)
        }, HOVER_CLOSE_DELAY)
      }
    }
    document.addEventListener("pointermove", onMove)
    return () => {
      document.removeEventListener("pointermove", onMove)
      window.clearTimeout(closeTimer.current)
      closeTimer.current = undefined
    }
  }, [open, openedByHover, setOpen])

  React.useEffect(() => () => window.clearTimeout(openTimer.current), [])

  return (
    <SelectHoverContext value={{ triggerRef, contentRef, onTriggerEnter, onTriggerLeave }}>
      <SelectPrimitive.Root
        data-slot="select"
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        {...props}
      />
    </SelectHoverContext>
  )
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  const hover = React.useContext(SelectHoverContext)
  return (
    <SelectPrimitive.Trigger
      ref={hover?.triggerRef}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event)
        hover?.onTriggerEnter(event)
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event)
        hover?.onTriggerLeave(event)
      }}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group/select flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 outline-none select-none hover:border-ring/60 data-[state=open]:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/select:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const hover = React.useContext(SelectHoverContext)
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={hover?.contentRef}
        sideOffset={sideOffset}
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-200 ease-out data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", position === "popper" && "min-w-(--radix-select-trigger-width)", className )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
            position === "popper" && ""
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "transition-colors duration-150 relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

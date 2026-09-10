/**
 * thinking-orbs — dotted ModeFrame orb for Hermes Desktop.
 *
 * Pane + status chip. Observes gateway events and the native voice bus.
 * Never opens the microphone.
 */
import {
  PALETTE_AREA,
  STATUSBAR_AREAS,
  Tip,
  atom,
  host,
  useValue
} from '@hermes/plugin-sdk'
import { useEffect, useRef } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { classifyTool, paintOrb, phaseToOrbState } from './paint'

const ID = 'thinking-orbs'
const VOICE_BUS = 'hermes:voice-bus'

const $state = atom('idle')
const $preview = atom('')

/** Runtime session id → last orb state. Only the focused session is shown. */
const bySession = new Map()

function sessionAtom() {
  return host.state.focusedSessionId || host.state.activeSessionId
}

function currentSid() {
  const atom = sessionAtom()
  const id = atom && typeof atom.get === 'function' ? atom.get() : null
  return typeof id === 'string' && id.length > 0 ? id : ''
}

function currentState() {
  return $preview.get() || $state.get()
}

function eventIds(event, payload) {
  const ids = [event.session_id, payload.session_id, payload.stored_session_id]
  return ids.filter((id) => typeof id === 'string' && id.length > 0)
}

function showFor(sid, next) {
  if (sid) bySession.set(sid, next)
  const focused = currentSid()
  if (!focused || !sid || sid === focused) $state.set(next)
}

function showActive() {
  const focused = currentSid()
  $state.set((focused && bySession.get(focused)) || 'idle')
}

function isDark() {
  if (typeof document === 'undefined') return true
  const root = document.documentElement
  const theme = root.dataset.theme || root.getAttribute('data-theme') || ''
  if (theme.includes('light')) return false
  if (theme.includes('dark')) return true
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
}

function OrbCanvas({ size, label }) {
  const ref = useRef(null)
  const state = useValue($state)
  const preview = useValue($preview)
  const shown = preview || state

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    const started = performance.now()
    const loop = (now) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        raf = requestAnimationFrame(loop)
        return
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const px = Math.round(size * dpr)
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px
        canvas.height = px
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintOrb(ctx, size, currentState(), (now - started) / 1000, isDark())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [size, shown])

  return jsx('canvas', {
    ref,
    width: size,
    height: size,
    'aria-label': label,
    style: { width: size, height: size, display: 'block' }
  })
}

function OrbPane() {
  const state = useValue($state)
  const preview = useValue($preview)
  const shown = preview || state

  return jsxs('div', {
    className: 'flex h-full flex-col items-center justify-center gap-3 p-3 text-sm',
    children: [
      jsx(OrbCanvas, { size: 96, label: `Thinking orb ${shown}` }),
      jsx('div', {
        className: 'text-(--ui-text-secondary)',
        children: shown
      }),
      jsx('div', {
        className: 'text-[0.6875rem] text-(--ui-text-quaternary)',
        children: preview ? 'preview — /orbs off via palette' : 'live'
      })
    ]
  })
}

function StatusChip() {
  const state = useValue($state)
  const preview = useValue($preview)
  const shown = preview || state
  return jsx(Tip, {
    label: `Thinking orb · ${shown}`,
    children: jsx('div', {
      className: 'inline-flex h-full items-center px-1',
      children: jsx(OrbCanvas, { size: 18, label: shown })
    })
  })
}

function applyEvent(event) {
  if (!event || typeof event !== 'object') return
  const type = String(event.type || '')
  if (type === 'thinking.delta') return

  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}
  const ids = eventIds(event, payload)
  const active = currentSid()
  const sid = ids[0] || active || ''

  // Unscoped stream events belong to the focused turn. Scoped events from
  // other sessions only update the cache so a later switch can show them.
  const forActive = !ids.length || (active && ids.includes(active))

  if (type === 'session.info' && typeof payload.running === 'boolean') {
    showFor(sid, payload.running ? bySession.get(sid) || 'thinking' : 'idle')
    return
  }

  if (type === 'message.start') {
    showFor(sid, 'thinking')
    return
  }
  if (type === 'message.delta' || type === 'message.interim') {
    if (forActive || sid) showFor(sid, 'composing')
    return
  }
  if (type === 'message.complete' || type === 'error') {
    showFor(sid, 'idle')
    return
  }
  if (type === 'tool.start' || type === 'tool.generating') {
    showFor(sid, classifyTool(payload.toolName || payload.name || payload.tool || payload.tool_name))
    return
  }
  if (type === 'tool.complete') {
    showFor(sid, 'thinking')
  }
}

function onVoiceBus(event) {
  const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {}
  const phase = String(detail.phase || detail.state || '')
  if (!phase) return
  $preview.set('')
  showFor(currentSid() || '', phaseToOrbState(phase, detail.toolName))
}

export default {
  id: ID,
  name: 'Thinking Orbs',
  defaultEnabled: true,
  register(ctx) {
    const offGw = host.onEvent('*', applyEvent)
    const sidAtom = sessionAtom()
    const offSid =
      typeof sidAtom.subscribe === 'function'
        ? sidAtom.subscribe(() => showActive())
        : typeof sidAtom.listen === 'function'
          ? sidAtom.listen(() => showActive())
          : null
    showActive()
    if (typeof window !== 'undefined') {
      window.addEventListener(VOICE_BUS, onVoiceBus)
    }

    const dispose = ctx.registerMany
      ? ctx.registerMany([
          {
            id: 'pane',
            area: 'panes',
            title: 'thinking orb',
            data: { placement: 'right', width: '220px' },
            render: () => jsx(OrbPane, {})
          },
          {
            id: 'chip',
            area: STATUSBAR_AREAS.right,
            order: 126,
            render: () => jsx(StatusChip, {})
          },
          {
            id: 'preview',
            area: PALETTE_AREA,
            data: {
              id: 'thinking-orbs.preview',
              label: 'Thinking Orbs: Preview cycle',
              keywords: ['orb', 'thinking', 'preview'],
              run: () => {
                const seq = ['listening', 'thinking', 'searching', 'working', 'shaping', 'composing', 'speaking']
                let i = 0
                $preview.set(seq[0])
                const tick = () => {
                  i += 1
                  if (i >= seq.length) {
                    $preview.set('')
                    host.notify({ kind: 'info', message: 'Orb preview finished' })
                    return
                  }
                  $preview.set(seq[i])
                  setTimeout(tick, 1800)
                }
                setTimeout(tick, 1800)
              }
            }
          },
          {
            id: 'live',
            area: PALETTE_AREA,
            data: {
              id: 'thinking-orbs.live',
              label: 'Thinking Orbs: Back to live',
              keywords: ['orb', 'live'],
              run: () => $preview.set('')
            }
          }
        ])
      : undefined

    if (!ctx.registerMany) {
      ctx.register({
        id: 'pane',
        area: 'panes',
        title: 'thinking orb',
        data: { placement: 'right', width: '220px' },
        render: () => jsx(OrbPane, {})
      })
      ctx.register({
        id: 'chip',
        area: STATUSBAR_AREAS.right,
        order: 126,
        render: () => jsx(StatusChip, {})
      })
    }

    return () => {
      try {
        offGw?.()
      } catch {
        /* ignore */
      }
      try {
        offSid?.()
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener(VOICE_BUS, onVoiceBus)
      }
      try {
        dispose?.()
      } catch {
        /* ignore */
      }
    }
  }
}

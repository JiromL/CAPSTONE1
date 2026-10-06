'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader2, ArrowUp, RotateCcw, BookOpen, AlertCircle, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { api } from '@/utils/api';
import { PERMA_COLOR } from '@/utils/perma';

// CPS-hosted chat with EMA. The backend relays each message to EMA as the signed-in
// student using their saved EMA key, so there is no second EMA login here.

type GraphState = 'wait_input' | 'wait_journal' | 'wait_activity' | 'end';

interface Journal {
  date?: string | null;
  perma_label?: string;
  summary?: string;
  highest_perma?: string;
  lowest_perma?: string;
  activity?: string | null;
}

interface ChatMessage {
  sender: 'ai' | 'human';
  type: 'utterance' | 'journal' | 'activities';
  date_sent?: string;
  content?: string;
  journal?: Journal;
  activities?: string[];
}

const RATINGS = [
  { value: 1, label: 'Very low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

const PERMA_NAMES: Record<string, string> = {
  P: 'Positive emotion', E: 'Engagement', R: 'Relationships', M: 'Meaning', A: 'Accomplishment',
};

// Same label colors as the EMA analytics page
const LABEL_COLORS: Record<string, string> = PERMA_COLOR;   // validated, theme-aware

const tint = (pct: number) => `color-mix(in srgb, var(--color-primary) ${pct}%, transparent)`;

export function EmaAvatar({ size = 28 }: { size?: number }) {
  return (
    <span className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.46, background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}
      aria-hidden>
      E
    </span>
  );
}

export function EmaChat({ onNeedsRelink }: { onNeedsRelink: () => void }) {
  const [phase, setPhase]           = useState<'loading' | 'rating' | 'chat'>('loading');
  const [conversationId, setConvId] = useState('');
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [graphState, setGraphState] = useState<GraphState>('wait_input');
  const [rating, setRating]         = useState<number | null>(null);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [journalSaved, setJournalSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(api(path), {
      ...init,
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`, 'Content-Type': 'application/json' },
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 409 && d.needs_relink) { onNeedsRelink(); throw new Error(''); }
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
    return d;
  };

  useEffect(() => {
    call('/api/mhbot/chat/session')
      .then(d => {
        if (d.conversation) {
          setConvId(d.conversation.id);
          setMessages(d.conversation.messages);
          setGraphState(d.conversation.graph_state);
          setPhase('chat');
        } else {
          setPhase('rating');
        }
      })
      .catch(e => { if (e.message) { setError(e.message); setPhase('rating'); } });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  // Grow the message box with its text, up to about five lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const start = async (value: number) => {
    setSending(true); setError(''); setRating(value);
    try {
      const d = await call('/api/mhbot/chat/start', { method: 'POST', body: JSON.stringify({ rating: value }) });
      setConvId(d.conversation_id);
      setMessages(d.messages);
      setGraphState(d.graph_state);
      if (d.resumed) setRating(null);
      setPhase('chat');
    } catch (e) {
      setRating(null);
      if (e instanceof Error && e.message) setError(e.message);
    } finally { setSending(false); }
  };

  const send = async (content: string | null, shown?: ChatMessage, extra?: Record<string, unknown>) => {
    if (sending) return;
    setSending(true); setError('');
    if (shown) setMessages(m => [...m, shown]);
    try {
      const d = await call('/api/mhbot/chat/message', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversationId, content, ...extra }),
      });
      setMessages(m => [...m, ...d.messages]);
      setGraphState(d.graph_state);
      if (d.cps_journal_saved) setJournalSaved(true);
    } catch (e) {
      if (shown) setMessages(m => m.slice(0, -1));
      if (e instanceof Error && e.message) setError(e.message);
      if (content && shown?.type === 'utterance') setInput(content);
    } finally { setSending(false); }
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    send(text, { sender: 'human', type: 'utterance', content: text });
  };

  const newCheckIn = () => { setMessages([]); setConvId(''); setGraphState('wait_input'); setRating(null); setJournalSaved(false); setPhase('rating'); };

  if (phase === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-border-strong)' }} />
      </div>
    );
  }

  if (phase === 'rating') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-6 py-8 gap-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <EmaAvatar size={36} />
            <div className="space-y-1.5 pt-0.5">
              <p className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                Hi! Before we talk, how are you feeling right now?
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                There&apos;s no wrong answer. EMA uses this to start the conversation in the right place.
              </p>
            </div>
          </div>

          <div role="radiogroup" aria-label="How are you feeling right now?" className="grid grid-cols-5 gap-1.5">
            {RATINGS.map(r => {
              const chosen = rating === r.value;
              return (
                <button key={r.value} role="radio" aria-checked={chosen} onClick={() => start(r.value)} disabled={sending}
                  className="group flex flex-col items-center gap-1.5 rounded-xl pt-3 pb-2.5 border transition-colors disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    borderColor: chosen ? 'var(--color-primary)' : 'var(--color-border)',
                    background: chosen ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: chosen ? 'white' : 'var(--color-text-primary)',
                    opacity: sending && !chosen ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!sending && !chosen) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; } }}
                  onMouseLeave={e => { if (!chosen) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; } }}>
                  <span className="text-xl font-semibold tabular-nums leading-none">{r.value}</span>
                  {/* Fill level grows with the rating so the scale reads at a glance */}
                  <span className="w-6 h-1 rounded-full overflow-hidden" style={{ background: chosen ? 'rgba(255,255,255,0.3)' : tint(12) }}>
                    <span className="block h-full rounded-full" style={{ width: `${r.value * 20}%`, background: chosen ? 'white' : 'var(--color-primary)' }} />
                  </span>
                  <span className="text-[11px] leading-none" style={{ color: chosen ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)' }}>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="min-h-5">
            {sending && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={12} className="animate-spin" /> Starting your check-in…
              </p>
            )}
            {error && <ErrorNote text={error} />}
          </div>
        </div>
        <CrisisLine />
      </div>
    );
  }

  const lastIndex = messages.length - 1;
  // At wait_journal, EMA saves whatever is sent next as the journal entry (its own app shows an
  // editable "Suggested Journal Entry" with a Submit button), so the latest journal is editable here.
  const editableJournal = graphState === 'wait_journal'
    ? messages.map(m => m.type).lastIndexOf('journal')
    : -1;
  const startedAt = messages[0]?.date_sent ? new Date(messages[0].date_sent) : null;
  const ratingLabel = RATINGS.find(r => r.value === rating)?.label;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center mb-5">
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
            {ratingLabel
              ? <>Check-in started · feeling {rating}/5, {ratingLabel.toLowerCase()}</>
              : <>Continuing your check-in</>}
            {startedAt && <> · {startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</>}
          </span>
        </div>

        <div className="space-y-1">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const firstOfGroup = !prev || prev.sender !== m.sender;
            const gap = firstOfGroup && i > 0 ? 'pt-3' : '';

            if (m.type === 'journal' && m.journal) {
              return (
                <div key={i} className={`${gap} pl-9`}>
                  {i === editableJournal
                    ? <JournalEditor journal={m.journal} disabled={sending}
                        onSubmit={(text, saveToCps) => send(text, undefined, { save_to_cps_journal: saveToCps, journal_label: m.journal?.perma_label })} />
                    : <JournalCard journal={m.journal} />}
                </div>
              );
            }

            if (m.type === 'activities' && m.activities) {
              if (m.sender === 'human') return <Bubble key={i} sender="human" text={m.activities[0]} className={gap} />;
              const active = i === lastIndex && graphState === 'wait_activity' && !sending;
              return (
                <div key={i} className={`${gap} pl-9 space-y-1.5`}>
                  <p className="text-[11px] font-medium uppercase tracking-wide pt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Pick an activity to try
                  </p>
                  {m.activities.map(a => (
                    <button key={a} disabled={!active}
                      onClick={() => send(a, { sender: 'human', type: 'activities', activities: [a] })}
                      className="w-full flex items-center justify-between gap-3 text-left text-sm px-3.5 py-2.5 rounded-xl border transition-colors disabled:opacity-55 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
                      onMouseEnter={e => { if (active) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}>
                      <span>{a}</span>
                      <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  ))}
                </div>
              );
            }

            return (
              <Bubble key={i} sender={m.sender} text={m.content ?? ''} className={gap}
                showAvatar={m.sender === 'ai' && firstOfGroup} />
            );
          })}

          {sending && (
            <div className={`flex items-end gap-2 ${messages[lastIndex]?.sender === 'ai' ? '' : 'pt-3'}`}>
              <EmaAvatar />
              <div className="px-4 py-3.5 rounded-2xl rounded-bl-md" style={{ background: 'var(--color-bg)' }}
                role="status" aria-label="EMA is typing">
                <span className="ema-typing"><span /><span /><span /></span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {journalSaved && graphState !== 'end' && (
        <div className="px-4 pb-2">
          <p className="text-xs rounded-lg px-3 py-2 flex items-center gap-1.5" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
            <CheckCircle2 size={13} className="flex-shrink-0" /> Saved to your <Link href="/journal" className="font-medium underline underline-offset-2">private CPS journal</Link>.
          </p>
        </div>
      )}
      {error && <div className="px-4 pb-2"><ErrorNote text={error} /></div>}

      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {graphState === 'end' ? (
          <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3" style={{ background: 'var(--color-success-surface)' }}>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Check-in complete</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {journalSaved
                    ? <>Also saved to your <Link href="/journal" className="font-medium underline underline-offset-2">private CPS journal</Link>.</>
                    : 'Your journal and wellbeing result are saved.'}
                </p>
              </div>
            </div>
            <button onClick={newCheckIn}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-white whitespace-nowrap"
              style={{ background: 'var(--color-primary)' }}>
              <RotateCcw size={12} /> New check-in
            </button>
          </div>
        ) : graphState === 'wait_activity' || graphState === 'wait_journal' ? (
          <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
            {graphState === 'wait_activity'
              ? 'Choose one of the activities above to continue.'
              : 'Submit your journal above to finish this check-in.'}
          </p>
        ) : (
          <form onSubmit={submitText}
            className="flex items-end gap-2 rounded-2xl border pl-3.5 pr-1.5 py-1.5 transition-shadow focus-within:shadow-[var(--shadow-primary)]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <label htmlFor="ema-message" className="sr-only">Message EMA</label>
            <textarea id="ema-message" ref={inputRef} value={input} onChange={e => setInput(e.target.value)} rows={1}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(e); } }}
              placeholder="Message EMA…"
              className="flex-1 resize-none bg-transparent text-sm py-2 outline-none leading-relaxed"
              style={{ color: 'var(--color-text-primary)' }} />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send message"
              className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2"
              style={{ background: 'var(--color-primary)' }}>
              <ArrowUp size={17} strokeWidth={2.4} />
            </button>
          </form>
        )}
      </div>
      <CrisisLine />
    </div>
  );
}

function Bubble({ sender, text, showAvatar, className = '' }: { sender: 'ai' | 'human'; text: string; showAvatar?: boolean; className?: string }) {
  if (sender === 'human') {
    return (
      <div className={`flex justify-end ${className}`}>
        <p className="text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-md max-w-[82%] whitespace-pre-wrap animate-fade-up"
          style={{ background: 'var(--color-primary)', color: 'white' }}>
          {text}
        </p>
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {showAvatar ? <EmaAvatar /> : <span className="w-7 flex-shrink-0" />}
      <p className="text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-tl-md max-w-[82%] whitespace-pre-wrap animate-fade-up"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
        {text}
      </p>
    </div>
  );
}

function LabelChip({ label }: { label: string }) {
  const color = LABEL_COLORS[label] ?? 'var(--color-text-muted)';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color: 'var(--color-text-primary)' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function PermaFacts({ journal }: { journal: Journal }) {
  if (!journal.highest_perma && !journal.lowest_perma) return null;
  const facts = [
    journal.highest_perma && { k: 'Strongest', v: PERMA_NAMES[journal.highest_perma] ?? journal.highest_perma },
    journal.lowest_perma && { k: 'Needs care', v: PERMA_NAMES[journal.lowest_perma] ?? journal.lowest_perma },
  ].filter(Boolean) as { k: string; v: string }[];
  return (
    <div className="grid grid-cols-2 gap-2">
      {facts.map(f => (
        <div key={f.k} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--color-bg)' }}>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{f.k}</p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{f.v}</p>
        </div>
      ))}
    </div>
  );
}

function JournalHeader({ journal, title }: { journal: Journal; title: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-primary-text)' }}>
        <BookOpen size={13} /> {title}
      </p>
      {journal.perma_label && <LabelChip label={journal.perma_label} />}
    </div>
  );
}

function JournalCard({ journal }: { journal: Journal }) {
  return (
    <div className="rounded-2xl border p-4 space-y-3 animate-fade-up" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      <JournalHeader journal={journal} title="Journal entry" />
      {journal.summary && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{journal.summary}</p>
      )}
      <PermaFacts journal={journal} />
      {journal.activity && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Activity: <span style={{ color: 'var(--color-text-secondary)' }}>{journal.activity}</span>
        </p>
      )}
    </div>
  );
}

function JournalEditor({ journal, disabled, onSubmit }: { journal: Journal; disabled: boolean; onSubmit: (text: string, saveToCps: boolean) => void }) {
  const [text, setText] = useState(journal.summary ?? '');
  const [saveToCps, setSaveToCps] = useState(true);
  return (
    <div className="rounded-2xl border p-4 space-y-3 animate-fade-up"
      style={{ borderColor: 'var(--color-primary)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-primary)' }}>
      <JournalHeader journal={journal} title="Suggested journal entry" />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        EMA wrote this from your conversation. Change anything that doesn&apos;t sound like you.
      </p>
      <label htmlFor="ema-journal" className="sr-only">Journal entry</label>
      <textarea id="ema-journal" value={text} onChange={e => setText(e.target.value)} rows={6} disabled={disabled}
        className="w-full resize-y text-sm leading-relaxed px-3 py-2.5 rounded-xl outline-none transition-shadow focus:shadow-[var(--shadow-primary)]"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
      <PermaFacts journal={journal} />
      <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
        <input type="checkbox" checked={saveToCps} onChange={e => setSaveToCps(e.target.checked)} disabled={disabled}
          className="mt-0.5" style={{ accentColor: 'var(--color-primary)' }} />
        <span>Also save a copy to my CPS journal. It stays private: only you can see it.</span>
      </label>
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>You can&apos;t edit it in EMA after submitting.</p>
        <button onClick={() => onSubmit(text.trim(), saveToCps)} disabled={disabled || !text.trim()}
          className="text-xs font-medium px-3.5 py-2 rounded-lg text-white whitespace-nowrap disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}>
          Submit journal
        </button>
      </div>
    </div>
  );
}

function CrisisLine() {
  return (
    <p className="flex-shrink-0 flex items-center justify-center gap-1.5 text-[11px] px-4 pb-3 pt-1" style={{ color: 'var(--color-text-muted)' }}>
      <Phone size={11} /> Need help right now? Call NCMH <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>1553</span> · open 24/7
    </p>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="text-xs rounded-lg px-3 py-2 flex items-center gap-1.5"
      style={{ color: 'var(--color-danger-text)', background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
      <AlertCircle size={13} className="flex-shrink-0" /> {text}
    </p>
  );
}

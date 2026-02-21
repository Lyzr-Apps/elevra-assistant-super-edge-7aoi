'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { generateUUID, cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import {
  RiSendPlaneFill,
  RiChat3Line,
  RiDashboardLine,
  RiCheckLine,
  RiSearchLine,
  RiDownloadLine,
  RiDeleteBinLine,
  RiEditLine,
  RiTimeLine,
  RiCalendarLine,
  RiMailLine,
  RiPhoneLine,
  RiUser3Line,
  RiBriefcaseLine,
  RiMoneyDollarCircleLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiSparklingLine,
  RiTargetLine
} from 'react-icons/ri'

// --- Constants ---
const AGENT_ID = '699979073f15947a386b5c97'
const LEADS_STORAGE_KEY = 'elevra_studio_leads'

// --- TypeScript Interfaces ---
interface LeadData {
  full_name: string
  business_name: string
  service_type: string
  project_goal: string
  budget: string
  timeline: string
  email: string
  phone: string
}

interface BookingData {
  date: string
  time: string
  timezone: string
  status: string
}

interface ParsedResponse {
  message: string
  lead_data: LeadData | null
  booking_data: BookingData | null
  current_step: string
  action_taken: string | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  lead_data?: LeadData | null
  booking_data?: BookingData | null
  current_step?: string
  action_taken?: string | null
  timestamp: number
}

interface StoredLead {
  id: string
  lead_data: LeadData
  booking_data: BookingData | null
  current_step: string
  created_at: string
}

// --- Sample Data ---
const SAMPLE_LEADS: StoredLead[] = [
  {
    id: 'sample-1',
    lead_data: {
      full_name: 'Sophia Laurent',
      business_name: 'Laurent Atelier',
      service_type: 'Brand Identity',
      project_goal: 'Complete rebrand of luxury fashion boutique with modern minimalist aesthetic',
      budget: '$15,000 - $25,000',
      timeline: '8-12 weeks',
      email: 'sophia@laurentatelier.com',
      phone: '+1 (212) 555-0194'
    },
    booking_data: { date: '2025-02-28', time: '10:00 AM', timezone: 'EST', status: 'confirmed' },
    current_step: 'booking_confirmed',
    created_at: '2025-02-18T14:30:00Z'
  },
  {
    id: 'sample-2',
    lead_data: {
      full_name: 'James Chen',
      business_name: 'NovaTech Solutions',
      service_type: 'Web Design',
      project_goal: 'Enterprise SaaS dashboard redesign with improved user experience',
      budget: '$20,000 - $35,000',
      timeline: '12-16 weeks',
      email: 'james@novatech.io',
      phone: '+1 (415) 555-0287'
    },
    booking_data: null,
    current_step: 'confirmed',
    created_at: '2025-02-17T09:15:00Z'
  },
  {
    id: 'sample-3',
    lead_data: {
      full_name: 'Amara Osei',
      business_name: 'Golden Hour Wellness',
      service_type: 'UI/UX',
      project_goal: 'Mobile app design for holistic wellness platform with booking system',
      budget: '$10,000 - $18,000',
      timeline: '6-10 weeks',
      email: 'amara@goldenhourwell.com',
      phone: '+1 (310) 555-0163'
    },
    booking_data: { date: '2025-03-05', time: '2:00 PM', timezone: 'PST', status: 'confirmed' },
    current_step: 'booking_confirmed',
    created_at: '2025-02-16T16:45:00Z'
  },
  {
    id: 'sample-4',
    lead_data: {
      full_name: 'Marcus Lindgren',
      business_name: 'Nordic Brew Co.',
      service_type: 'Digital Marketing',
      project_goal: 'Launch campaign for new artisanal coffee subscription service',
      budget: '$8,000 - $12,000',
      timeline: '4-6 weeks',
      email: 'marcus@nordicbrew.co',
      phone: '+46 70 555 0412'
    },
    booking_data: null,
    current_step: 'confirmed',
    created_at: '2025-02-15T11:20:00Z'
  },
  {
    id: 'sample-5',
    lead_data: {
      full_name: 'Isabella Vega',
      business_name: 'Casa del Sol',
      service_type: 'Content Creation',
      project_goal: 'Photography and video content for luxury resort marketing materials',
      budget: '$5,000 - $10,000',
      timeline: '3-4 weeks',
      email: 'isabella@casadelsol.mx',
      phone: '+52 55 5555 0891'
    },
    booking_data: { date: '2025-03-10', time: '11:00 AM', timezone: 'CST', status: 'confirmed' },
    current_step: 'booking_confirmed',
    created_at: '2025-02-14T08:00:00Z'
  }
]

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 's1',
    role: 'agent',
    content: 'Welcome to Elevra Studio. We craft premium digital experiences for discerning brands. I am your personal concierge -- how may I assist you today?',
    current_step: 'greeting',
    timestamp: Date.now() - 60000
  },
  {
    id: 's2',
    role: 'user',
    content: 'Hi, I am interested in a brand identity project for my boutique.',
    timestamp: Date.now() - 55000
  },
  {
    id: 's3',
    role: 'agent',
    content: 'Wonderful. Brand identity is one of our signature offerings. To begin curating your experience, may I have your full name?',
    current_step: 'collecting_name',
    timestamp: Date.now() - 50000
  }
]

// --- Helpers ---
function parseAgentResponse(result: any): ParsedResponse {
  const agentResult = result?.response?.result
  let parsed: any

  if (typeof agentResult === 'string') {
    try {
      parsed = JSON.parse(agentResult)
    } catch {
      parsed = { message: agentResult }
    }
  } else if (agentResult?.message) {
    parsed = agentResult
  } else if (result?.response?.message) {
    parsed = { message: result.response.message }
  } else {
    const text = agentResult?.text || agentResult?.response || agentResult?.content || (agentResult ? JSON.stringify(agentResult) : 'No response received.')
    parsed = { message: text }
  }

  return {
    message: parsed?.message ?? '',
    lead_data: parsed?.lead_data ?? null,
    booking_data: parsed?.booking_data ?? null,
    current_step: parsed?.current_step ?? '',
    action_taken: parsed?.action_taken ?? null
  }
}

function loadLeadsFromStorage(): StoredLead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLeadsToStorage(leads: StoredLead[]) {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
  } catch {
    // silently fail
  }
}

function exportCSV(leads: StoredLead[]) {
  const headers = ['Full Name', 'Business Name', 'Service Type', 'Project Goal', 'Budget', 'Timeline', 'Email', 'Phone', 'Booking Status', 'Booking Date', 'Created At']
  const rows = leads.map(l => [
    l.lead_data?.full_name ?? '',
    l.lead_data?.business_name ?? '',
    l.lead_data?.service_type ?? '',
    l.lead_data?.project_goal ?? '',
    l.lead_data?.budget ?? '',
    l.lead_data?.timeline ?? '',
    l.lead_data?.email ?? '',
    l.lead_data?.phone ?? '',
    l.booking_data?.status ?? 'Not Scheduled',
    l.booking_data?.date ?? '',
    l.created_at ?? ''
  ])

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `elevra_leads_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-medium text-sm mt-2 mb-1 tracking-wider">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-medium text-base mt-2 mb-1 tracking-wider">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-medium text-lg mt-3 mb-1 tracking-wider">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium">{part}</strong> : part
  )
}

// --- Typing Indicator ---
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-1 py-3">
      <div className="w-8 h-8 border border-border flex items-center justify-center bg-muted flex-shrink-0">
        <RiSparklingLine className="w-4 h-4 text-primary" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-muted border border-border">
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  )
}

// --- Lead Summary Card ---
function LeadSummaryCard({ leadData, onConfirm, onEdit, disabled }: {
  leadData: LeadData
  onConfirm: () => void
  onEdit: () => void
  disabled: boolean
}) {
  const fields = [
    { icon: RiUser3Line, label: 'Full Name', value: leadData?.full_name },
    { icon: RiBriefcaseLine, label: 'Business', value: leadData?.business_name },
    { icon: RiSparklingLine, label: 'Service', value: leadData?.service_type },
    { icon: RiTargetLine, label: 'Goal', value: leadData?.project_goal },
    { icon: RiMoneyDollarCircleLine, label: 'Budget', value: leadData?.budget },
    { icon: RiTimeLine, label: 'Timeline', value: leadData?.timeline },
    { icon: RiMailLine, label: 'Email', value: leadData?.email },
    { icon: RiPhoneLine, label: 'Phone', value: leadData?.phone },
  ]

  return (
    <Card className="border border-primary/30 bg-card shadow-sm my-3 max-w-md">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium tracking-widest uppercase text-primary font-serif">Project Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-1 gap-2.5">
          {fields.map((f, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <f.icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans">{f.label}</p>
                <p className="text-sm text-foreground leading-relaxed break-words">{f.value || '--'}</p>
              </div>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={onConfirm} disabled={disabled} className="flex-1 tracking-wider text-xs uppercase font-sans">
            <RiCheckLine className="w-3.5 h-3.5 mr-1.5" />
            Confirm
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} disabled={disabled} className="flex-1 tracking-wider text-xs uppercase font-sans">
            <RiEditLine className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Booking Confirmation Card ---
function BookingConfirmCard({ bookingData }: { bookingData: BookingData }) {
  return (
    <Card className="border border-green-300 bg-green-50/30 shadow-sm my-3 max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-100 border border-green-300 flex items-center justify-center">
            <RiCheckDoubleLine className="w-3.5 h-3.5 text-green-700" />
          </div>
          <span className="text-xs font-medium tracking-widest uppercase text-green-700 font-serif">Booking Confirmed</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <RiCalendarLine className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{bookingData?.date || '--'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <RiTimeLine className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{bookingData?.time || '--'} ({bookingData?.timezone || 'N/A'})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Agent Status ---
function AgentStatusBar({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/50">
      <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-primary animate-pulse' : 'bg-green-500')} />
      <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-sans">
        Elevra Concierge Agent
      </span>
      <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
        {AGENT_ID.slice(0, 8)}...
      </span>
    </div>
  )
}

// --- Chat Screen ---
function ClientChat({ sampleMode }: { sampleMode: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userId] = useState(() => generateUUID())
  const [sessionId, setSessionId] = useState('')
  const [initDone, setInitDone] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50)
    return () => clearTimeout(timer)
  }, [messages, isLoading, scrollToBottom])

  // Auto-send greeting on mount (only real mode)
  useEffect(() => {
    if (sampleMode || initDone) return
    setInitDone(true)

    const sendGreeting = async () => {
      setIsLoading(true)
      try {
        const result = await callAIAgent('Hello', AGENT_ID, { user_id: userId })
        if (result?.session_id) {
          setSessionId(result.session_id)
        }
        const parsed = parseAgentResponse(result)
        const agentMsg: ChatMessage = {
          id: generateUUID(),
          role: 'agent',
          content: parsed.message,
          lead_data: parsed.lead_data,
          booking_data: parsed.booking_data,
          current_step: parsed.current_step,
          action_taken: parsed.action_taken,
          timestamp: Date.now()
        }
        setMessages([agentMsg])
      } catch {
        setMessages([{
          id: generateUUID(),
          role: 'agent',
          content: 'Welcome to Elevra Studio. How may I assist you today?',
          timestamp: Date.now()
        }])
      } finally {
        setIsLoading(false)
      }
    }

    sendGreeting()
  }, [sampleMode, initDone, userId])

  // Show sample messages when in sample mode
  useEffect(() => {
    if (sampleMode) {
      setMessages(SAMPLE_MESSAGES)
    }
  }, [sampleMode])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || sampleMode) return

    const userMsg: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const result = await callAIAgent(text.trim(), AGENT_ID, {
        user_id: userId,
        session_id: sessionId || undefined
      })

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      const parsed = parseAgentResponse(result)

      const agentMsg: ChatMessage = {
        id: generateUUID(),
        role: 'agent',
        content: parsed.message,
        lead_data: parsed.lead_data,
        booking_data: parsed.booking_data,
        current_step: parsed.current_step,
        action_taken: parsed.action_taken,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, agentMsg])

      // Save lead if confirmed
      if (parsed.lead_data && (parsed.current_step === 'confirmed' || parsed.current_step === 'booking_confirmed' || parsed.current_step === 'completed')) {
        const existingLeads = loadLeadsFromStorage()
        const newLead: StoredLead = {
          id: generateUUID(),
          lead_data: parsed.lead_data,
          booking_data: parsed.booking_data,
          current_step: parsed.current_step,
          created_at: new Date().toISOString()
        }
        saveLeadsToStorage([newLead, ...existingLeads])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: generateUUID(),
        role: 'agent',
        content: 'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, sampleMode, userId, sessionId])

  const handleConfirm = useCallback(() => {
    sendMessage('Yes, confirmed')
  }, [sendMessage])

  const handleEdit = useCallback(() => {
    sendMessage('I would like to edit my details')
  }, [sendMessage])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }, [sendMessage, inputValue])

  return (
    <div className="flex flex-col h-full">
      {/* Welcome Banner */}
      <div className="px-6 py-8 text-center border-b border-border bg-card flex-shrink-0">
        <h2 className="font-serif text-2xl font-light tracking-widest text-foreground uppercase mb-1">Elevra Studio</h2>
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground font-sans font-light">Premium Digital Creative Agency</p>
        <Separator className="max-w-[80px] mx-auto mt-4" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <RiSparklingLine className="w-8 h-8 text-primary/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground tracking-wider font-light">Preparing your experience...</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'agent' ? (
              <div className="flex items-start gap-3 px-1 py-3 max-w-xl">
                <div className="w-8 h-8 border border-border flex items-center justify-center bg-muted flex-shrink-0 mt-0.5">
                  <RiSparklingLine className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground leading-relaxed font-light tracking-wide">
                    {renderMarkdown(msg.content)}
                  </div>

                  {/* Lead Summary Card */}
                  {msg.lead_data && (msg.current_step === 'showing_summary' || msg.current_step === 'confirmed') && (
                    <LeadSummaryCard
                      leadData={msg.lead_data}
                      onConfirm={handleConfirm}
                      onEdit={handleEdit}
                      disabled={isLoading || sampleMode}
                    />
                  )}

                  {/* Booking Card */}
                  {msg.booking_data && (msg.booking_data?.status?.toLowerCase()?.includes('confirmed') || msg.current_step === 'booking_confirmed') && (
                    <BookingConfirmCard bookingData={msg.booking_data} />
                  )}

                  {/* Action Taken Badge */}
                  {msg.action_taken && (
                    <Badge variant="outline" className="mt-2 text-[10px] tracking-wider uppercase font-sans text-muted-foreground">
                      {msg.action_taken}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-end px-1 py-3">
                <div className="max-w-sm px-4 py-2.5 bg-primary text-primary-foreground text-sm leading-relaxed tracking-wide font-light">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      {/* Agent Status */}
      <AgentStatusBar isActive={isLoading} />

      {/* Input Bar */}
      <div className="border-t border-border bg-card px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-2xl mx-auto">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={sampleMode ? 'Sample mode active' : 'Type your message...'}
            disabled={isLoading || sampleMode}
            className="flex-1 text-sm tracking-wide font-light border-border bg-background h-10"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !inputValue.trim() || sampleMode}
            className="h-10 w-10 p-0 flex-shrink-0"
          >
            <RiSendPlaneFill className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

// --- Admin Dashboard ---
function AdminDashboard({ sampleMode }: { sampleMode: boolean }) {
  const [leads, setLeads] = useState<StoredLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<StoredLead[]>([])
  const [serviceFilter, setServiceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState<StoredLead | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')
  const itemsPerPage = 8

  // Load leads
  useEffect(() => {
    const stored = loadLeadsFromStorage()
    if (sampleMode) {
      setLeads([...SAMPLE_LEADS, ...stored])
    } else {
      setLeads(stored)
    }
  }, [sampleMode])

  // Filter leads
  useEffect(() => {
    let result = [...leads]

    if (serviceFilter !== 'all') {
      result = result.filter(l => l.lead_data?.service_type?.toLowerCase() === serviceFilter.toLowerCase())
    }

    if (statusFilter === 'confirmed') {
      result = result.filter(l => l.booking_data?.status?.toLowerCase()?.includes('confirmed'))
    } else if (statusFilter === 'not_scheduled') {
      result = result.filter(l => !l.booking_data || !l.booking_data?.status?.toLowerCase()?.includes('confirmed'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        (l.lead_data?.full_name?.toLowerCase()?.includes(q)) ||
        (l.lead_data?.business_name?.toLowerCase()?.includes(q)) ||
        (l.lead_data?.email?.toLowerCase()?.includes(q))
      )
    }

    setFilteredLeads(result)
    setCurrentPage(1)
  }, [leads, serviceFilter, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage))
  const pagedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleDelete = useCallback(() => {
    if (!leadToDelete) return
    const updated = leads.filter(l => l.id !== leadToDelete)
    setLeads(updated)
    const realLeads = updated.filter(l => !l.id.startsWith('sample-'))
    saveLeadsToStorage(realLeads)
    setDeleteConfirmOpen(false)
    setLeadToDelete(null)
    setDetailOpen(false)
    setSelectedLead(null)
    setStatusMessage('Lead deleted successfully.')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [leadToDelete, leads])

  const handleExport = useCallback(() => {
    if (filteredLeads.length === 0) {
      setStatusMessage('No leads to export.')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    exportCSV(filteredLeads)
    setStatusMessage(`Exported ${filteredLeads.length} lead(s).`)
    setTimeout(() => setStatusMessage(''), 3000)
  }, [filteredLeads])

  const getBookingBadge = (lead: StoredLead) => {
    if (lead.booking_data?.status?.toLowerCase()?.includes('confirmed')) {
      return <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] tracking-wider uppercase font-sans font-normal hover:bg-green-100">Confirmed</Badge>
    }
    return <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-sans font-normal">Not Scheduled</Badge>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Dashboard Header */}
      <div className="px-6 py-5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-lg font-light tracking-widest uppercase text-foreground">Client Leads</h2>
            <p className="text-xs tracking-wider text-muted-foreground font-sans mt-0.5">{filteredLeads.length} record{filteredLeads.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="tracking-wider text-xs uppercase font-sans">
            <RiDownloadLine className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, business, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm tracking-wide font-light h-9 bg-background"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[170px] h-9 text-xs tracking-wider bg-background">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="brand identity">Brand Identity</SelectItem>
              <SelectItem value="web design">Web Design</SelectItem>
              <SelectItem value="ui/ux">UI/UX</SelectItem>
              <SelectItem value="digital marketing">Digital Marketing</SelectItem>
              <SelectItem value="content creation">Content Creation</SelectItem>
              <SelectItem value="custom projects">Custom Projects</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs tracking-wider bg-background">
              <SelectValue placeholder="Booking Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="not_scheduled">Not Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="px-6 py-2 bg-primary/10 border-b border-primary/20 flex-shrink-0">
          <p className="text-xs tracking-wider text-primary font-sans">{statusMessage}</p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RiUser3Line className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground tracking-wider font-light">No leads match your criteria</p>
              <p className="text-xs text-muted-foreground/60 tracking-wider mt-1">
                {leads.length === 0 ? 'Start a conversation to collect your first lead.' : 'Try adjusting your filters.'}
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground">Full Name</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground hidden md:table-cell">Business</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground hidden lg:table-cell">Service</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground hidden lg:table-cell">Budget</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground hidden xl:table-cell">Timeline</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase font-sans font-normal text-muted-foreground hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors"
                  onClick={() => { setSelectedLead(lead); setDetailOpen(true) }}
                >
                  <TableCell className="text-sm font-light tracking-wide">{lead.lead_data?.full_name ?? '--'}</TableCell>
                  <TableCell className="text-sm font-light tracking-wide text-muted-foreground hidden md:table-cell">{lead.lead_data?.business_name ?? '--'}</TableCell>
                  <TableCell className="text-sm font-light tracking-wide text-muted-foreground hidden lg:table-cell">{lead.lead_data?.service_type ?? '--'}</TableCell>
                  <TableCell className="text-sm font-light tracking-wide text-muted-foreground hidden lg:table-cell">{lead.lead_data?.budget ?? '--'}</TableCell>
                  <TableCell className="text-sm font-light tracking-wide text-muted-foreground hidden xl:table-cell">{lead.lead_data?.timeline ?? '--'}</TableCell>
                  <TableCell>{getBookingBadge(lead)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-xs text-muted-foreground tracking-wider font-sans">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <RiArrowLeftLine className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <RiArrowRightLine className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Agent Status */}
      <AgentStatusBar isActive={false} />

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-light tracking-widest uppercase">Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Full Name</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.full_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Business</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.business_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Service Type</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.service_type ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Budget</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.budget ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Timeline</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.timeline ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Email</p>
                  <p className="text-sm text-foreground tracking-wide break-all">{selectedLead.lead_data?.email ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Phone</p>
                  <p className="text-sm text-foreground tracking-wide">{selectedLead.lead_data?.phone ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Created</p>
                  <p className="text-sm text-foreground tracking-wide">{formatDate(selectedLead.created_at)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-1">Project Goal</p>
                <p className="text-sm text-foreground leading-relaxed tracking-wide">{selectedLead.lead_data?.project_goal ?? '--'}</p>
              </div>

              {selectedLead.booking_data && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans mb-2">Booking</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <RiCalendarLine className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.booking_data?.date ?? '--'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RiTimeLine className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.booking_data?.time ?? '--'}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] tracking-wider uppercase font-sans font-normal hover:bg-green-100">
                        {selectedLead.booking_data?.status ?? 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (selectedLead) {
                  setLeadToDelete(selectedLead.id)
                  setDeleteConfirmOpen(true)
                }
              }}
              className="tracking-wider text-xs uppercase font-sans"
            >
              <RiDeleteBinLine className="w-3.5 h-3.5 mr-1.5" />
              Delete Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-serif text-base font-light tracking-widest uppercase">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed tracking-wide">
            Are you sure you want to delete this lead? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeleteConfirmOpen(false); setLeadToDelete(null) }}
              className="tracking-wider text-xs uppercase font-sans"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="tracking-wider text-xs uppercase font-sans"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Error Boundary ---
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-serif font-light tracking-widest mb-2 uppercase">Something Went Wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm tracking-wider">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-6 py-2 bg-primary text-primary-foreground text-xs tracking-widest uppercase"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Main Page ---
export default function Page() {
  const [sampleMode, setSampleMode] = useState(false)

  return (
    <PageErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Tabs defaultValue="chat" className="flex flex-col h-screen">
          <header className="border-b border-border bg-card px-6 py-0 flex-shrink-0">
            <div className="flex items-center justify-between h-14">
              <h1 className="font-serif text-base font-light tracking-[0.3em] uppercase text-foreground hidden sm:block">
                Elevra Studio
              </h1>
              <h1 className="font-serif text-base font-light tracking-[0.3em] uppercase text-foreground sm:hidden">
                Elevra
              </h1>

              <TabsList className="bg-transparent h-auto gap-0 p-0">
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3.5 text-xs tracking-widest uppercase font-sans font-light text-muted-foreground data-[state=active]:text-foreground transition-none"
                >
                  <RiChat3Line className="w-3.5 h-3.5 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3.5 text-xs tracking-widest uppercase font-sans font-light text-muted-foreground data-[state=active]:text-foreground transition-none"
                >
                  <RiDashboardLine className="w-3.5 h-3.5 mr-2" />
                  Dashboard
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-[10px] tracking-widest uppercase text-muted-foreground font-sans cursor-pointer hidden sm:inline">
                  Sample
                </Label>
                <Switch
                  id="sample-toggle"
                  checked={sampleMode}
                  onCheckedChange={setSampleMode}
                  className="scale-75"
                />
              </div>
            </div>
          </header>

          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            <div className="h-full max-w-3xl mx-auto w-full flex flex-col border-x border-border bg-card">
              <ClientChat sampleMode={sampleMode} />
            </div>
          </TabsContent>

          <TabsContent value="admin" className="flex-1 m-0 overflow-hidden">
            <div className="h-full flex flex-col">
              <AdminDashboard sampleMode={sampleMode} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageErrorBoundary>
  )
}

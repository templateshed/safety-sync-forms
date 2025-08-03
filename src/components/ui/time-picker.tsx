import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TimePickerProps {
  time?: string
  onSelect?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({
  time,
  onSelect,
  placeholder = "Pick a time",
  disabled = false,
  className,
}: TimePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null)
  const [selectedMinute, setSelectedMinute] = React.useState<number | null>(null)

  // Parse initial time value
  React.useEffect(() => {
    if (time) {
      const [hour, minute] = time.split(':').map(Number)
      setSelectedHour(hour)
      setSelectedMinute(minute)
    } else {
      setSelectedHour(null)
      setSelectedMinute(null)
    }
  }, [time])

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const formatDisplayTime = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
  }

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedHour(hour)
    setSelectedMinute(minute)
    onSelect?.(formatTime(hour, minute))
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time && selectedHour !== null && selectedMinute !== null 
            ? formatDisplayTime(selectedHour, selectedMinute)
            : <span>{placeholder}</span>
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 pointer-events-auto">
          <div className="grid grid-cols-2 gap-2">
            {/* Hours */}
            <div>
              <div className="text-sm font-medium mb-2 text-center">Hour</div>
              <div className="max-h-48 overflow-y-auto border rounded">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => {
                      const minute = selectedMinute ?? 0
                      handleTimeSelect(hour, minute)
                    }}
                    className={cn(
                      "w-full px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                      selectedHour === hour && "bg-primary text-primary-foreground"
                    )}
                  >
                    {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Minutes */}
            <div>
              <div className="text-sm font-medium mb-2 text-center">Minute</div>
              <div className="max-h-48 overflow-y-auto border rounded">
                {minutes.filter(m => m % 15 === 0).map((minute) => (
                  <button
                    key={minute}
                    onClick={() => {
                      const hour = selectedHour ?? 0
                      handleTimeSelect(hour, minute)
                    }}
                    className={cn(
                      "w-full px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                      selectedMinute === minute && "bg-primary text-primary-foreground"
                    )}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {selectedHour !== null && selectedMinute !== null && (
            <div className="mt-3 pt-3 border-t text-center">
              <div className="text-sm text-muted-foreground">
                Selected: {formatDisplayTime(selectedHour, selectedMinute)}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
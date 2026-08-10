import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import moment from 'moment';

interface UpcomingMeetingsFeedProps {
  meetings: any[];
  onOpenMeeting: (id: string) => void;
}

export function UpcomingMeetingsFeed({ meetings, onOpenMeeting }: UpcomingMeetingsFeedProps) {
  if (!meetings || meetings.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Agenda Futura</h3>
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div 
            key={meeting.id}
            onClick={() => onOpenMeeting(meeting.id)}
            className="flex items-center justify-between p-4 bg-white dark:bg-[#111B21] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{meeting.title}</h4>
                <div className="text-sm text-gray-500 font-medium">
                  {moment(meeting.event_date).format('dddd, DD/MM [às] HH:mm')}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

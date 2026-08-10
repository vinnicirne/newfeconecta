import React from "react";
import { ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PendingAction } from "../../../domains/meetings/application/PendingTaskGenerator";

export function PendingTasks({ tasks, onAction }: { tasks: PendingAction[], onAction: (action: any) => void }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-emerald-900">Tudo pronto!</h3>
          <p className="text-sm text-emerald-700">Não há pendências para o próximo encontro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        Atenção Necessária
      </h3>
      
      <div className="grid grid-cols-1 gap-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            onClick={() => onAction(task.action)}
            className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors group"
          >
            <div>
              <h4 className="font-bold text-yellow-900 dark:text-yellow-500">{task.title}</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-600 mt-1">{task.description}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-yellow-200 dark:bg-yellow-500/30 flex items-center justify-center text-yellow-700 dark:text-yellow-500 group-hover:scale-110 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { DashboardContext } from "../application/DashboardAggregator";

export interface WidgetConfig<TData = any> {
  id: string;
  zone: 'main' | 'secondary' | 'sidebar' | 'footer';
  priority: number;
  visible: (context: DashboardContext) => boolean;
  component: React.ComponentType<{ context: DashboardContext; data?: TData }>;
  mount?: () => void;
  unmount?: () => void;
  refresh?: () => void;
  destroy?: () => void;
}

export class DashboardWidgetRegistry {
  private static widgets: WidgetConfig[] = [];

  static register(config: WidgetConfig): void {
    const existing = this.widgets.findIndex(w => w.id === config.id);
    if (existing >= 0) {
      this.widgets[existing] = config;
    } else {
      this.widgets.push(config);
    }
    
    // Sort by priority descending
    this.widgets.sort((a, b) => b.priority - a.priority);
  }

  static getWidgetsForZone(zone: string, context: DashboardContext): WidgetConfig[] {
    return this.widgets.filter(w => w.zone === zone && w.visible(context));
  }

  static unregisterAll(): void {
    this.widgets = [];
  }
}

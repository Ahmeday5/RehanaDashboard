import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { StatisticsService } from '../../data/statistics.service';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { FinancialChartComponent } from '../../components/financial-chart/financial-chart.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

/**
 * Dashboard home — the first screen the app opens to (confirmed 2026-09-16).
 * Reads `GET /Dashboard/statistics`, a flat compound-wide snapshot with no
 * filtering/pagination, and presents it as the flagship screen: a greeting
 * hero, then three labeled sections (overview / invitations / financial +
 * visitors) built from the shared `StatCardComponent`/`FinancialChartComponent`
 * so every number gets the same entrance choreography.
 */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatCardComponent, FinancialChartComponent, RefreshButtonComponent, IconComponent, ButtonComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  protected readonly stats = inject(StatisticsService);
  private readonly auth = inject(AuthService);

  protected readonly userName = computed(() => this.auth.currentUser()?.userName ?? '');

  /**
   * A dedicated getter for the loaded snapshot — `@else if (expr; as x)` is
   * only valid on the primary `@if` in Angular's control-flow syntax (NG5002
   * on any later branch), so the template reads this instead of trying to
   * bind `as` on its third branch.
   */
  protected readonly data = computed(() => this.stats.state().data);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  });

  ngOnInit(): void {
    void this.stats.load();
  }

  protected refresh(): void {
    void this.stats.load(true);
  }
}

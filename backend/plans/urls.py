from django.urls import path
from .views import (
    PlanListCreateView,
    PlanDetailView,
    PlanPauseView,
    PlanResumeView,
    PlanCloseView,
    PlanActivateView,
    PlanHistoryListView,
    PlanDashboardMetricsView,
)

urlpatterns = [
    # Metrics
    path('plans/metrics/', PlanDashboardMetricsView.as_view(), name='plan-metrics'),

    # Subscription Plan CRUD
    path('plans/', PlanListCreateView.as_view(), name='plan-list-create'),
    path('plans/<int:pk>/', PlanDetailView.as_view(), name='plan-detail'),

    # Lifecycle Status Transitions
    path('plans/<int:pk>/pause/', PlanPauseView.as_view(), name='plan-pause'),
    path('plans/<int:pk>/resume/', PlanResumeView.as_view(), name='plan-resume'),
    path('plans/<int:pk>/close/', PlanCloseView.as_view(), name='plan-close'),
    path('plans/<int:pk>/activate/', PlanActivateView.as_view(), name='plan-activate'),

    # Audit Status History
    path('plans/<int:pk>/history/', PlanHistoryListView.as_view(), name='plan-history'),
]


from django.urls import path
from .views import (
    SubscriptionConvertView,
    SubscriptionListView,
    SubscriptionDetailView,
    SubscriptionActivateView,
    SubscriptionPauseView,
    SubscriptionResumeView,
    SubscriptionRenewView,
    SubscriptionCloseView,
    SubscriptionHistoryListView,
    SubscriptionRenewalListView,
)

urlpatterns = [
    # Conversion from Confirmed Quotation
    path('subscriptions/convert/<int:quotation_id>/', SubscriptionConvertView.as_view(), name='subscription-convert'),

    # Subscription CRUD
    path('subscriptions/', SubscriptionListView.as_view(), name='subscription-list'),
    path('subscriptions/<int:pk>/', SubscriptionDetailView.as_view(), name='subscription-detail'),

    # Lifecycle Operations
    path('subscriptions/<int:pk>/activate/', SubscriptionActivateView.as_view(), name='subscription-activate'),
    path('subscriptions/<int:pk>/pause/', SubscriptionPauseView.as_view(), name='subscription-pause'),
    path('subscriptions/<int:pk>/resume/', SubscriptionResumeView.as_view(), name='subscription-resume'),
    path('subscriptions/<int:pk>/renew/', SubscriptionRenewView.as_view(), name='subscription-renew'),
    path('subscriptions/<int:pk>/close/', SubscriptionCloseView.as_view(), name='subscription-close'),

    # History & Renewals
    path('subscriptions/<int:pk>/history/', SubscriptionHistoryListView.as_view(), name='subscription-history'),
    path('subscriptions/<int:pk>/renewals/', SubscriptionRenewalListView.as_view(), name='subscription-renewals'),
]


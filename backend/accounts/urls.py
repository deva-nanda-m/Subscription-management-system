from django.urls import path
from .views import (
    CustomerRegistrationView,
    CustomLoginView,
    CustomTokenRefreshView,
    LogoutView,
    UserProfileView,
    ForgotPasswordView,
    ResetPasswordView,
    AdminStaffListCreateView,
    AdminStaffDetailView,
    AdminStaffStatusUpdateView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', CustomerRegistrationView.as_view(), name='auth-register'),
    path('auth/login/', CustomLoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/me/', UserProfileView.as_view(), name='auth-me'),

    # Password recovery endpoints
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),

    # Admin Staff Management endpoints
    path('admin/staff/', AdminStaffListCreateView.as_view(), name='admin-staff-list-create'),
    path('admin/staff/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('admin/staff/<int:pk>/status/', AdminStaffStatusUpdateView.as_view(), name='admin-staff-status-update'),
]


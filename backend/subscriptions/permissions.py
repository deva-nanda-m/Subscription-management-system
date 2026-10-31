from rest_framework import permissions
from accounts.models import Role


class IsAdminOrStaff(permissions.BasePermission):
    """
    Grants access exclusively to authenticated Admin and Staff users.
    Customers receive 403 Forbidden.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (Role.ADMIN, Role.STAFF)


class IsSubscriptionOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission for Subscriptions:
    - Admin and Staff can manage all subscriptions.
    - Customers can only read their own subscriptions.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == Role.CUSTOMER:
            return request.method in permissions.SAFE_METHODS
        return request.user.role in (Role.ADMIN, Role.STAFF)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in (Role.ADMIN, Role.STAFF):
            return True
        return obj.customer_id == request.user.id


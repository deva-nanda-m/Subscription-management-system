from rest_framework import permissions
from accounts.models import Role


class IsAdminOrStaffReadOnly(permissions.BasePermission):
    """
    Admin has full read/write access.
    Staff has read-only access (GET, HEAD, OPTIONS).
    Customers are denied access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == Role.ADMIN:
            return True
        if request.user.role == Role.STAFF and request.method in permissions.SAFE_METHODS:
            return True
        return False


class IsAdminUserOnly(permissions.BasePermission):
    """
    Restricted strictly to Administrator role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.ADMIN
        )


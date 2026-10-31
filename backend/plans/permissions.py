from rest_framework import permissions
from accounts.models import Role


class IsAdminOrStaffReadOnly(permissions.BasePermission):
    """
    Grants write access (POST, PUT, PATCH, DELETE, status actions) strictly to ADMIN.
    Grants read access (GET, HEAD, OPTIONS) to authenticated STAFF and ADMIN.
    Customers are denied access to administrative plan management endpoints.
    """
    message = "Plan management is restricted to Brightloop Administrator accounts."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False

        # Admin has full administrative capabilities
        if request.user.role == Role.ADMIN:
            return True

        # Staff has read-only operational clearance
        if request.user.role == Role.STAFF and request.method in permissions.SAFE_METHODS:
            return True

        # Customers cannot access administrative plan management
        return False


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


class IsQuotationOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission for Quotations:
    - Admin and Staff can manage all quotations.
    - Customers can only read and confirm their own quotations.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Customers can only access read-only or confirmation/pdf actions
        if request.user.role == Role.CUSTOMER:
            action = getattr(view, 'action', None)
            if request.method in permissions.SAFE_METHODS or action in ('confirm', 'pdf'):
                return True
            # Also allow confirm endpoint on view-based APIViews
            if request.path.endswith('/confirm/') or request.path.endswith('/pdf/'):
                return True
            return False
        return request.user.role in (Role.ADMIN, Role.STAFF)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in (Role.ADMIN, Role.STAFF):
            return True
        # For customer, object's customer must match authenticated user
        return obj.customer_id == request.user.id

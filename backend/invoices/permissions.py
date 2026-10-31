from rest_framework import permissions
from accounts.models import Role


class IsAdminOrStaff(permissions.BasePermission):
    """
    Grants access exclusively to Admin and Staff roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.ADMIN, Role.STAFF]
        )


class IsInvoiceOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission:
    Admin and Staff can access any invoice.
    Customers can only access their own invoices.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role in [Role.ADMIN, Role.STAFF]:
            return True
        return obj.customer_id == request.user.id


from django.contrib import admin
from .models import User, PasswordResetToken


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'full_name', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'full_name')
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined', 'updated_at')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used',)
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'token_hash')

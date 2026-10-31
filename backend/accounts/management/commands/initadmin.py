import os
from django.core.management.base import BaseCommand
from django.core.exceptions import ValidationError
from accounts.models import User, Role
from accounts.validators import validate_password_complexity


class Command(BaseCommand):
    help = 'Initialize the first Brightloop Administrator account securely from environment variables or arguments.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Admin email address')
        parser.add_argument('--password', type=str, help='Admin password')
        parser.add_argument('--name', type=str, help='Admin full name')

    def handle(self, *args, **options):
        email = options['email'] or os.getenv('INITIAL_ADMIN_EMAIL', 'admin@brightloop.com')
        password = options['password'] or os.getenv('INITIAL_ADMIN_PASSWORD', 'Admin@Brightloop2026!')
        name = options['name'] or os.getenv('INITIAL_ADMIN_NAME', 'System Administrator')

        email = email.strip().lower()

        try:
            validate_password_complexity(password)
        except ValidationError as e:
            self.stderr.write(self.style.ERROR(f"Password complexity check failed: {', '.join(e.messages)}"))
            return

        if User.objects.filter(email__iexact=email).exists():
            admin_user = User.objects.get(email__iexact=email)
            admin_user.full_name = name
            admin_user.role = Role.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.is_active = True
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Administrator '{email}' already exists. Password and privileges refreshed successfully."))
        else:
            User.objects.create_superuser(
                email=email,
                full_name=name,
                password=password,
                role=Role.ADMIN
            )
            self.stdout.write(self.style.SUCCESS(f"Initial Administrator '{email}' created successfully with ADMIN role."))


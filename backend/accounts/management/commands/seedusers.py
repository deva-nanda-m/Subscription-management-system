from django.core.management.base import BaseCommand
from accounts.models import User, Role


class Command(BaseCommand):
    help = 'Seeds default users for Admin, Staff, and Customer roles.'

    def handle(self, *args, **options):
        # Admin
        admin, created = User.objects.get_or_create(
            email='admin@brightloop.io',
            defaults={
                'full_name': 'System Administrator',
                'role': Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password('BrightloopAdmin2026!')
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin user: admin@brightloop.io"))
        else:
            self.stdout.write("Admin user already exists.")

        # Staff
        staff, created = User.objects.get_or_create(
            email='staff@brightloop.io',
            defaults={
                'full_name': 'Operational Staff Member',
                'role': Role.STAFF,
            }
        )
        if created:
            staff.set_password('BrightloopStaff2026!')
            staff.save()
            self.stdout.write(self.style.SUCCESS("Created staff user: staff@brightloop.io"))
        else:
            self.stdout.write("Staff user already exists.")

        # Customer
        customer, created = User.objects.get_or_create(
            email='customer@brightloop.io',
            defaults={
                'full_name': 'Acme Enterprise Corp',
                'role': Role.CUSTOMER,
            }
        )
        if created:
            customer.set_password('CustomerSecure2026!')
            customer.save()
            self.stdout.write(self.style.SUCCESS("Created customer user: customer@brightloop.io"))
        else:
            self.stdout.write("Customer user already exists.")


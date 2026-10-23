<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

#[Fillable(['name', 'email', 'password', 'role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasPushSubscriptions, Notifiable;

    public function isAdmin(): bool
    {
        return $this->roleForAuthorization() === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->roleForAuthorization() === 'owner';
    }

    public function roleForAuthorization(): ?string
    {
        $role = $this->getAttribute('role');

        if (!is_string($role) || $role === '') {
            // Jangan beri izin Admin ketika data role tidak tersedia.
            return null;
        }

        // Kompatibilitas akun Manager lama sebelum migrasi role dijalankan.
        return $role === 'manager' ? 'admin' : $role;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}

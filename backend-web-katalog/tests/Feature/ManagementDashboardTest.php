<?php

namespace Tests\Feature;

use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagementDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_and_manager_can_view_actual_inventory_and_unavailable_sales(): void
    {
        produk::create([
            'nama_produk' => 'Stok Normal',
            'deskripsi_produk' => 'Produk normal',
            'harga_produk' => 10000,
            'stok' => 7,
            'stok_minimum' => 3,
        ]);
        produk::create([
            'nama_produk' => 'Stok Kritis',
            'deskripsi_produk' => 'Produk kritis',
            'harga_produk' => 12000,
            'stok' => 2,
            'stok_minimum' => 3,
        ]);
        produk::create([
            'nama_produk' => 'Stok Habis',
            'deskripsi_produk' => 'Produk habis',
            'harga_produk' => 15000,
            'stok' => 0,
            'stok_minimum' => 2,
        ]);

        foreach (['admin', 'owner'] as $role) {
            $token = User::factory()->create(['role' => $role])
                ->createToken($role)
                ->plainTextToken;

            $this->withToken($token)
                ->getJson('/api/management/dashboard')
                ->assertOk()
                ->assertJsonPath('data.inventory.total_products', 3)
                ->assertJsonPath('data.inventory.available_products', 2)
                ->assertJsonPath('data.inventory.critical_stock', 1)
                ->assertJsonPath('data.inventory.out_of_stock', 1)
                ->assertJsonPath('data.inventory.items.0.status', 'out_of_stock')
                ->assertJsonPath('data.sales.available', false)
                ->assertJsonPath('data.sales.today_revenue', null)
                ->assertJsonPath('data.reports.sales_available', false);
        }
    }

    public function test_management_dashboard_rejects_unauthenticated_and_customer_roles(): void
    {
        $this->getJson('/api/management/dashboard')->assertUnauthorized();

        $token = User::factory()->create(['role' => 'customer'])
            ->createToken('customer')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/management/dashboard')
            ->assertForbidden();
    }

    public function test_management_roles_cannot_use_admin_write_endpoints(): void
    {
        $ownerToken = User::factory()->create(['role' => 'owner'])
            ->createToken('owner')
            ->plainTextToken;

        $this->withToken($ownerToken)
            ->postJson('/api/produk', [
                'nama_produk' => 'Tidak boleh dibuat',
                'deskripsi_produk' => 'Uji akses',
                'harga_produk' => 10000,
            ])
            ->assertForbidden();
    }

    public function test_manager_legacy_role_is_not_an_active_role(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $token = $manager
            ->createToken('legacy-manager')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/management/dashboard')
            ->assertForbidden();

        $this->postJson('/api/auth/login', [
            'email' => $manager->email,
            'password' => 'password',
        ])->assertUnprocessable();
    }

    public function test_management_role_can_log_in_without_changing_admin_login(): void
    {
        User::factory()->create([
            'role' => 'owner',
            'email' => 'owner@kukibakehouse.com',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'owner@kukibakehouse.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'owner');
    }

    public function test_empty_inventory_returns_zero_metrics(): void
    {
        $token = User::factory()->create(['role' => 'owner'])
            ->createToken('owner')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/management/dashboard')
            ->assertOk()
            ->assertJsonPath('data.inventory.total_products', 0)
            ->assertJsonPath('data.inventory.available_products', 0)
            ->assertJsonPath('data.inventory.critical_stock', 0)
            ->assertJsonPath('data.inventory.out_of_stock', 0)
            ->assertJsonCount(0, 'data.inventory.items');
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserPresence;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresenciaEnMapaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        if (getenv('DB_CONNECTION') !== 'sqlite' || getenv('DB_DATABASE') !== ':memory:') {
            $this->markTestSkipped('Requiere SQLite en memoria.');
        }

        parent::setUp();
    }

    public function test_muestra_la_posicion_propia_y_solo_vecinos_vigentes_que_comparten(): void
    {
        $url = route('presence.index');
        $paula = $this->usuario('Paula');
        $nico = $this->usuario('Nico');
        $anterior = $this->usuario('Anterior');
        $vencido = $this->usuario('Vencido');
        $lejano = $this->usuario('Lejano');
        $cerca = ['latitude' => -38.95349, 'longitude' => -68.05551];
        UserPresence::query()->insert([
            ['user_id' => $anterior->id, ...$cerca, 'expires_at' => now()->addMinute(), 'shares_name' => false],
            ['user_id' => $vencido->id, ...$cerca, 'expires_at' => now()->subMinute(), 'shares_name' => true],
        ]);
        UserPresence::share($lejano, -39.5, -68.0);

        $this->getJson($url)->assertUnauthorized();
        $this->actingAs($paula)->putJson($url, $cerca)->assertUnprocessable()->assertJsonValidationErrors('share_name');
        $this->getJson($url)->assertExactJson(['own' => null, 'data' => [], 'sharing' => false]);

        $this->putJson($url, [...$cerca, 'share_name' => true])->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('own.name', 'Paula')
            ->assertJsonPath('own.latitude', -38.953)
            ->assertJsonPath('own.longitude', -68.056);

        $this->actingAs($nico)->putJson($url, [...$cerca, 'share_name' => true])->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('own.name', 'Nico')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Paula')
            ->assertJsonMissingPath('data.0.user_id')
            ->assertJsonMissingPath('data.0.email');

        $this->actingAs($paula)->deleteJson($url)->assertNoContent();
        $this->actingAs($nico)->getJson($url)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_renovar_mantiene_la_presencia_vigente_y_no_reactiva_una_detencion(): void
    {
        $usuario = $this->usuario('Alma');
        $this->actingAs($usuario);
        $url = route('presence.index');
        $ubicacion = ['latitude' => -38.953, 'longitude' => -68.056, 'share_name' => true];

        $this->putJson($url, $ubicacion)->assertOk();
        $this->travel(2)->minutes();
        $this->putJson($url, [...$ubicacion, 'renew' => true])->assertOk()->assertJsonPath('own.name', 'Alma');
        $this->travel(2)->minutes();
        $this->getJson($url)->assertOk()->assertJsonPath('sharing', true);
        $this->travel(2)->minutes();
        $this->putJson($url, [...$ubicacion, 'renew' => true])->assertGone();

        $this->putJson($url, $ubicacion)->assertOk();
        $this->deleteJson($url)->assertNoContent();
        $this->putJson($url, [...$ubicacion, 'renew' => true])->assertGone();
        $this->getJson($url)->assertOk()->assertJsonPath('sharing', false);
    }

    private function usuario(string $nombre): User
    {
        return User::create([
            'name' => $nombre,
            'email' => strtolower($nombre).'@dinomaps.test',
            'password' => 'contrasena-de-prueba',
        ]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPresence extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function share(User $user, float $latitude, float $longitude, bool $renew = false): bool
    {
        $now = now();
        $position = [
            'latitude' => round($latitude, 3),
            'longitude' => round($longitude, 3),
            'expires_at' => $now->copy()->addMinutes(3),
        ];

        if ($renew) {
            $presence = static::query()->visible()->whereKey($user->getKey());

            return $presence->update($position) > 0 || $presence->exists();
        }

        static::query()->where('expires_at', '<=', $now)->delete();
        static::query()->upsert([[
            'user_id' => $user->getKey(),
            ...$position,
            'shares_name' => true,
        ]], ['user_id'], ['latitude', 'longitude', 'shares_name', 'expires_at']);

        return true;
    }

    #[Scope]
    protected function visible(Builder $query): void
    {
        $query->where('expires_at', '>', now())->where('shares_name', true);
    }

    #[Scope]
    protected function near(Builder $query, self $origin): void
    {
        $latitudeRange = 8 / 111;
        $longitudeRange = $latitudeRange / max(0.01, cos(deg2rad($origin->latitude)));

        $query->whereKeyNot($origin->getKey())
            ->whereBetween('latitude', [$origin->latitude - $latitudeRange, $origin->latitude + $latitudeRange])
            ->whereBetween('longitude', [$origin->longitude - $longitudeRange, $origin->longitude + $longitudeRange]);
    }
}

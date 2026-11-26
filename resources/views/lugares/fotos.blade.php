@php($fotos = $lugar->fotos())
@if ($fotos)
    <div class="fotos-lugar">
        @foreach (array_slice($fotos, 0, ($soloPortada ?? false) ? 1 : 3) as $foto)
            <img src="{{ asset('images/dinomaps/lugares/'.$foto.'.webp') }}" alt="" loading="lazy">
        @endforeach
        @if ($lugar->tieneFotoDeReferencia())
            <span class="foto-referencia">Imagen de referencia</span>
        @endif
    </div>
@else
    <div class="foto-turismo-vacia" aria-label="Sin fotos disponibles" role="img">
        <img src="{{ asset('images/dinomaps/categorias/turismo.svg') }}" alt="">
    </div>
@endif

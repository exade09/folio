# Промпты на шесть настроений маскота

Шесть файлов, которые ищет `components/MascotImage.tsx`:

```
idle.png  thinking.png  answering.png  refusing.png  error.png  filed.png
```

## Как генерировать

Подавай аватарку из твиттера **референсом** (img2img / image reference /
character reference — как называется в твоём генераторе), а не полагайся на
текст: текстом персонаж каждый раз будет разным. Сила референса 0.35–0.5 —
достаточно, чтобы поза и глаза поменялись, но морда, пропорции и штриховка
остались те же.

Генерируй все шесть **в одну сессию, одним сидом**, меняя только блок эмоции.
Если генератор умеет фиксировать seed — зафиксируй: шесть кадров должны
выглядеть как один персонаж в шести моментах, а не как шесть похожих котов.

## Что одинаково во всех шести

Этот блок вставляй в каждый промпт без изменений:

> A simple white cartoon cat, head and upper chest only, facing the viewer,
> centred in the frame. Two plain triangular ears. Large solid black almond
> eyes with a thin upper eyelid line, set wide apart. No nose, no mouth,
> no whiskers — the face carries expression through the eyes, the ears and
> the tilt of the head alone. A slim black necktie against the white chest.
> Thin dark grey hand-drawn outline of even weight. Flat cornflower blue
> background, no gradient, no vignette, filling the whole square.
> Coloured-pencil rendering on visible paper grain, soft and matte, gentle
> tooth in the flat areas. Naive children's-book illustration, no shading
> beyond the pencil texture, no highlights, no 3D, no gloss.

## Что меняется — по одному блоку на настроение

### idle.png — ждёт
> The cat sits still and level, looking straight at the viewer. Ears upright
> and symmetrical. Eyes open, calm, neutral. Both paws out of frame. This is
> the resting pose — nothing is happening yet.

### thinking.png — читает дело
> The cat's head is tilted to its own left, ears angled the same way. The eyes
> look up and off to the side, away from the viewer, as if reading something
> just out of frame. One white paw is raised to the side of the chin. A single
> small pencil-drawn question mark floats in the air near the raised ear.

### answering.png — отвечает
> The cat leans very slightly forward towards the viewer, eyes open and
> attentive, looking directly at them. Ears perked forward. One white paw is
> lifted and open, palm up, in the small gesture of someone explaining a point.
> An open manila folder is held in the other paw at the bottom edge of the
> frame, tilted so only its edge shows.

### refusing.png — отказывает
> The cat's head is turned a few degrees away from the viewer while the eyes
> stay on them, flat and level. The eyelid lines sit lower than usual, so the
> eyes read as narrowed and unimpressed. Ears held back and slightly flattened.
> One white paw is raised, palm out towards the viewer, in a plain stop gesture.
> Nothing apologetic about the pose.

### error.png — застрял
> The cat's head is tilted off-balance, ears drooping down and outward. The
> eyes are wide and blank, pupils unfocused. A single small pencil-drawn sweat
> drop at the temple. Two loose sheets of paper tumble through the air on
> either side of the head. The necktie is knocked crooked.

### filed.png — подшил
> The cat's eyes are closed in two happy upward arcs, ears relaxed and upright,
> the whole face content. One white paw presses a small wooden rubber stamp
> down onto a closed manila folder at the bottom of the frame. A faint red
> stamped mark shows on the folder where the stamp has just landed.

## Формат файлов

| Требование | Значение |
| ---------- | -------- |
| Размер | 1024 × 1024, строго квадрат |
| Формат | PNG |
| Фон | залитый синий, тот же во всех шести — `#5a8df0` или что попадёт по аватарке, но **один** на все кадры |
| Кадрирование | голова и плечи, макушка ушей ≈ 8% от верха, подбородок ≈ 70% высоты — во всех шести одинаково |
| Масштаб головы | одинаковый в шести кадрах: компонент меняет картинки местами, и если голова «прыгает» в размере, переход выглядит сломанным |
| Вес | ≤ 300 КБ на файл, иначе правая панель заметно моргает при первой смене настроения |

Класть в `public/mascot/`, именами ровно как в списке сверху, строчными буквами.
Пока файла нет, на его месте рисуется пунктирная заглушка — ничего чинить не
нужно, компонент подхватит картинку сам.

## Негативный промпт

> mouth, teeth, tongue, nose, whiskers, pupils with highlights, glossy, 3D
> render, photorealistic, anime, thick black outline, gradient background,
> drop shadow, text, watermark, signature, multiple characters, full body,
> hands with fingers, realistic fur texture

## Что проверить перед тем, как класть в проект

Открой шесть картинок подряд в просмотрщике и пролистай стрелкой. Если при
переключении голова не смещается и не меняется в размере, а меняется только
выражение — кадры годные. Если «прыгает» — перегенерируй выпадающий кадр с тем
же сидом, а не правь остальные пять.

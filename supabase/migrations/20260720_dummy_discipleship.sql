insert into church_discipleship_tracks (church_id, title, description, lessons_count, icon_name, is_locked, order_index)
select id, 'Primeiros Passos', 'Fundamentos da fé cristã para novos convertidos.', 4, 'BookOpen', false, 1
from churches
where slug = 'teste'
and not exists (select 1 from church_discipleship_tracks where title = 'Primeiros Passos');

insert into church_discipleship_tracks (church_id, title, description, lessons_count, icon_name, is_locked, order_index)
select id, 'Maturidade Espiritual', 'Aprofundando nas disciplinas espirituais e caráter de Cristo.', 8, 'Trophy', false, 2
from churches
where slug = 'teste'
and not exists (select 1 from church_discipleship_tracks where title = 'Maturidade Espiritual');

insert into church_discipleship_tracks (church_id, title, description, lessons_count, icon_name, is_locked, order_index)
select id, 'Liderança e Chamado', 'Preparação para liderar células e ministérios na igreja.', 6, 'Lock', true, 3
from churches
where slug = 'teste'
and not exists (select 1 from church_discipleship_tracks where title = 'Liderança e Chamado');

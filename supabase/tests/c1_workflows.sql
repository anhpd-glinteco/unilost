begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000081','{}'),('00000000-0000-4000-8000-000000000082','{}'),('00000000-0000-4000-8000-000000000083','{}');
update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000000083';
insert into public.posts(id,owner_id,type,title,category,color,description,location,occurred_at,status,moderation)
values ('00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000081','found','C1 fixture','other','black','Synthetic proof fixture','Test','2026-01-01','verifying','hidden');
insert into public.claim_requests(id,post_id,requester_id,proof,status) values('00000000-0000-4000-8000-000000000085','00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000082','Synthetic C1 proof','accepted');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
do $$ begin
 begin perform public.complete_claim('00000000-0000-4000-8000-000000000085'); raise exception 'Admin completed for another owner'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$ begin
 begin perform public.complete_claim('00000000-0000-4000-8000-000000000085'); raise exception 'Requester completed'; exception when insufficient_privilege then null; end;
 begin perform public.moderate_post('00000000-0000-4000-8000-000000000084','restore'); raise exception 'Member moderated'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.complete_claim('00000000-0000-4000-8000-000000000085');
do $$ begin
 assert (select status='completed' from public.claim_requests where id='00000000-0000-4000-8000-000000000085');
 assert (select status='returned' and moderation='hidden' from public.posts where id='00000000-0000-4000-8000-000000000084');
 assert (select count(*)=1 from public.status_history where post_id='00000000-0000-4000-8000-000000000084' and from_status='verifying' and to_status='returned' and actor_id=auth.uid());
 begin perform public.complete_claim('00000000-0000-4000-8000-000000000085'); raise exception 'Repeated completion'; exception when insufficient_privilege then null; end;
 begin update public.posts set status='searching'; raise exception 'Direct status write'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select public.moderate_post('00000000-0000-4000-8000-000000000084','restore');
select public.moderate_post('00000000-0000-4000-8000-000000000084','hide');
do $$ begin
 begin perform public.moderate_post('00000000-0000-4000-8000-000000000084','hide'); raise exception 'Repeated hide'; exception when insufficient_privilege then null; end;
 begin perform public.moderate_post('00000000-0000-4000-8000-000000000084','delete'); raise exception 'Invalid action'; exception when invalid_parameter_value then null; end;
 assert (select count(*)=2 from public.moderation_actions where post_id='00000000-0000-4000-8000-000000000084');
 assert (select status='returned' from public.posts where id='00000000-0000-4000-8000-000000000084');
end $$;
reset role;
update public.posts set moderation='pending' where id='00000000-0000-4000-8000-000000000084';
set local role authenticated;
select public.moderate_post('00000000-0000-4000-8000-000000000084','publish');
reset role;
-- Inject audit/history failures inside this rollback-only suite, never in migration.
create function public.c1_fail() returns trigger language plpgsql as $$ begin raise exception 'C1 injected failure'; end $$;
create trigger c1_audit_failure before insert on public.moderation_actions for each row execute function public.c1_fail();
set local role authenticated;
do $$ begin
 begin perform public.moderate_post('00000000-0000-4000-8000-000000000084','hide'); raise exception 'missing audit failure'; exception when raise_exception then if sqlerrm<>'C1 injected failure' then raise; end if; end;
 assert (select moderation='published' from public.posts where id='00000000-0000-4000-8000-000000000084');
end $$;
reset role;
drop trigger c1_audit_failure on public.moderation_actions;
update public.posts set status='verifying' where id='00000000-0000-4000-8000-000000000084';
update public.claim_requests set status='accepted' where id='00000000-0000-4000-8000-000000000085';
create trigger c1_history_failure before insert on public.status_history for each row execute function public.c1_fail();
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
do $$ begin
 begin perform public.complete_claim('00000000-0000-4000-8000-000000000085'); raise exception 'missing history failure'; exception when raise_exception then if sqlerrm<>'C1 injected failure' then raise; end if; end;
 assert (select status='accepted' from public.claim_requests where id='00000000-0000-4000-8000-000000000085');
 assert (select status='verifying' from public.posts where id='00000000-0000-4000-8000-000000000084');
end $$;
rollback;

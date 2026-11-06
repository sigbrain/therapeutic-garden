package com.example.manage.service;

import com.example.manage.domain.Member;
import com.example.manage.domain.Schedule;
import com.example.manage.repository.MemberRepository;
import com.example.manage.repository.ScheduleRepository;
import com.example.manage.repository.ScheduleSpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleSpotRepository scheduleSpotRepository;

    public void createMember(
            Integer participantNo,
            Integer groupNo,
            String loginId,
            String rawPassword
    ) {

        if (memberRepository.findByLoginId(loginId).isPresent()) {
            return;
        }

        if (memberRepository.findByParticipantNo(participantNo).isPresent()) {
            return;
        }

        String encodedPassword = passwordEncoder.encode(rawPassword);
        Member member = new Member(participantNo, groupNo, loginId, encodedPassword);

        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public Member login(String loginId, String rawPassword) {

        Member member = memberRepository.findByLoginId(loginId).orElse(null);

        if (member == null) {
            return null;
        }

        if (!passwordEncoder.matches(rawPassword, member.getPassword())) {
            return null;
        }

        return member;
    }

    @Transactional(readOnly = true)
    public List<Member> findAllMembers() {
        return memberRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Member findMember(Long memberId) {
        return memberRepository.findById(memberId).orElse(null);
    }

    public String updateMember(
            Long memberId,
            Integer participantNo,
            Integer groupNo,
            String loginId,
            String name,
            String phone
    ) {

        /*
         * 수정할 참가자 조회
         */
        Member member =
                memberRepository.findById(memberId)
                        .orElse(null);

        if (member == null) {
            return "MEMBER_NOT_FOUND";
        }

        /*
         * 참가자 번호 중복 확인
         * 같은 참가자 번호를 사용하는 Member가 존재하면서,
         * 그 Member가 현재 수정 중인 본인이 아니라면 수정하지 않는다.
         */
        Member participantNoMember =
                memberRepository.findByParticipantNo(participantNo)
                        .orElse(null);

        if (participantNoMember != null
                && !participantNoMember.getMemberId().equals(memberId)) {
            return "PARTICIPANT_NO_DUPLICATE";
        }

        /*
         * 로그인 아이디 중복 확인
         * 같은 로그인 아이디를 사용하는 Member가 존재하면서,
         * 그 Member가 현재 수정 중인 본인이 아니라면 수정하지 않는다.
         */
        Member loginIdMember =
                memberRepository.findByLoginId(loginId)
                        .orElse(null);

        if (loginIdMember != null
                && !loginIdMember.getMemberId().equals(memberId)) {
            return "LOGIN_ID_DUPLICATE";
        }

        /*
         * 전화번호 형식 통일
         *
         * 관리자가
         * 010-****-****
         * 형식으로 입력해도
         *
         * DB에는
         * 010-****-****
         * 형식으로 저장한다.
         */
        if (phone != null) {
            phone = phone.replace("-", "");
        }


        /*
         * 참가자 정보 수정
         * MemberService 클래스에 @Transactional이 적용되어 있으므로
         * 트랜잭션 종료 시 JPA 변경 감지로 UPDATE SQL이 실행된다.
         */
        member.update(
                participantNo,
                groupNo,
                loginId,
                name,
                phone
        );

        return "SUCCESS";
    }

    public void deleteMember(Long memberId) {

        Member member = memberRepository.findById(memberId).orElse(null);

        if (member == null) {
            return;
        }

        List<Schedule> schedules = scheduleRepository.findByMemberMemberIdOrderByScheduleDateAsc(memberId);

        for (Schedule schedule : schedules) {

            scheduleSpotRepository.deleteByScheduleScheduleId(schedule.getScheduleId());
        }

        scheduleRepository.deleteAll(schedules);

        memberRepository.delete(member);
    }
}

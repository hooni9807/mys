# SPP 프롤로그 디자인

2026-10-21 웹·유튜브 검색을 바탕으로, 탁구의 서브와 회전을 짧은 이야기로 보여주는 첫 방문 프롤로그를 구성했다.

## 8초 구성

| 구간 | 장면 | 표현 |
| --- | --- | --- |
| 0–2.5초 | 서브 | 왼쪽 선수가 토스한 공을 치면 양쪽 코트에 한 번씩 바운드한 뒤 오른쪽 선수가 받아낸다. |
| 2.5–5.3초 | 회전 | 주황색·민트색 유니폼의 두 선수가 체중 이동과 스윙으로 번갈아 공을 친다. 공의 잔상과 타격 링으로 리듬을 표현한다. |
| 5.3–8초 | 준비 | 나만의 캐릭터와 코디로 참여하도록 초대한다. 소개가 끝난 뒤에도 두 선수의 랠리는 계속된다. |

짙은 솔잎색 바탕, 크림색 글자, 주황색 라켓과 포인트를 사용한다. 자체 제작한 SVG 사람 캐릭터와 테이블을 측면에서 보여주며, JavaScript의 한 타임라인으로 라켓·팔·무릎·발·공을 함께 갱신한다. 모바일에서는 그림을 제목 아래에 배치해 두 선수가 가려지지 않게 한다.

## 진입과 조작

- 첫 접속 시 프롤로그를 자동으로 표시한다. 닫거나 건너뛰면 이 브라우저에 관람 여부를 저장하고, 다음 접속부터 메인 화면을 바로 보여준다. 헤더의 **프롤로그 보기**로 언제든 다시 연다.
- 본문이 그려지기 전 첫 방문 여부를 판단한다. 프롤로그를 열기 전에는 SPP 배경을 보여주고, 파일 로딩 오류 또는 5초 이상 지연 시 메인 화면을 표시한다. 늦게 도착한 스크립트가 메인 위에 자동으로 프롤로그를 띄우지 않는다.
- 건너뛰기는 항상 사용할 수 있고, 일시정지와 다시 보기를 제공한다.
- 운영체제의 동작 줄이기 설정에서는 정지된 장면을 보여준다.
- Google 로그인은 선택 동작으로 제공하며 프롤로그 관람이나 메인 화면 진입의 필수 조건으로 만들지 않는다.

## 웹 참고 자료

- [Bee Grandinetti — Slowmo pong](https://dribbble.com/shots/2925978-Slowmo-pong): 제작자가 탁구 애니메이션의 팔 동작에 대해 설명한 작업 소개. 인물의 스윙을 중심으로 장면을 구성하는 방향에 참고했다.
- [Codrops — Motion Transition Effect](https://tympanus.net/codrops/2018/12/11/motion-transition-effect/): 탁구공 애니메이션에서 영감을 얻어 속도감과 잔상을 표현한 제작 글. SPP에서는 직접 작성한 짧은 공 궤적과 타격 링으로 재구성했다.
- [Josh Lange — Rockstar Games Presents: Table Tennis](https://www.joshlange.com/rockstar-games-presents-table-tennis.html): 담당 애니메이터가 선수별 동작 차이와 자연스러운 연결을 설명한 포트폴리오. 두 선수의 타격 순간과 준비 동작을 함께 맞추는 방향에 참고했다. 연결된 [두 캐릭터 게임플레이 영상](https://www.youtube.com/watch?v=PBwPTl9LTCM)은 재생 분석하지 않았으며 제작자의 설명을 확인했다.
- [Superhaus — World Table Tennis / ITTF](https://superhausfilm.com/world-table-tennis-en/): 제작사가 결승 티저의 역동적인 편집과 감정적 이미지, 공 추적과 회전 표시를 설명한다. 공의 궤적과 회전을 읽기 쉽게 보여주는 표현에 참고했다.
- [Lusion — My Little Storybook](https://v2.lusion.co/work/my-little-storybook/): 제작사가 일본 애니메이션에서 영감을 받은 웹 스토리텔링과 직접 제작한 3D·손그림의 조합을 설명한다. 짧은 장면을 이어 하나의 이야기로 만드는 구성에 참고했다.

## 유튜브 검색 자료

- [You Can’t Stop Us | Nike — NIKE JAPAN](https://www.youtube.com/watch?v=GbQomqb28os)
- [FEDERER: Twelve Final Days — Wimbledon 공식 예고편](https://www.youtube.com/watch?v=lRr1w8ZogY4)
- [Marty Supreme | Official Trailer HD — A24](https://www.youtube.com/watch?v=s9gSuKaKcqM)

유튜브 자료는 검색 결과와 영상 페이지에서 제목·게시 채널·설명 등 메타데이터를 확인했다. 영상 자체를 재생해 장면, 편집, 소리를 분석한 것은 아니다. 스포츠의 긴장감과 선수의 여정을 프롤로그로 소개하는 참고 후보로 삼았으며, 구체적인 3단 구성과 색상·동작은 SPP를 위해 새로 설계했다.

참고 자료에서는 아이디어만 얻었다. 외부 영상, 음악, 로고, 사진을 복사하거나 게임에 포함하지 않으며, 화면에는 자체 제작한 SVG·CSS·JavaScript 표현을 사용한다.
